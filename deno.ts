import { renderToString } from "./mod.ts";
import type { JSX } from "./types.ts";

function jupyterEnabled() {
  try {
    return !!Deno.jupyter;
  } catch {
    // Deno.jyputer is a getter that throws if not enabled
    return false;
  }
}

export async function renderToImage(
  element: JSX.Element,
): Promise<Uint8Array<ArrayBuffer>> {
  const png = await renderTo("png", element);

  if (jupyterEnabled()) {
    return Object.defineProperty(png, Deno.jupyter.$display, {
      value: () => ({ "image/png": png.toBase64() }),
      enumerable: true,
    });
  }
  return png;
}

export async function renderToSTL(
  element: JSX.Element,
): Promise<Uint8Array<ArrayBuffer>> {
  const stl = await renderTo("asciistl", element);

  if (jupyterEnabled()) {
    return Object.defineProperty(stl, Deno.jupyter.$display, {
      value: () => stlToHTML(stl),
      enumerable: true,
    });
  }
  return stl;
}

async function renderTo(
  format: "png" | "asciistl" | "binstl",
  element: JSX.Element,
) {
  const child = new Deno.Command("openscad", {
    args: ["-o", "-", "--export-format", format, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const writeP = ReadableStream.from([renderToString(element)])
    .pipeThrough(new TextEncoderStream())
    .pipeTo(child.stdin);

  writeP.catch(() => child.kill()).catch(() => {});

  const [out] = await Promise.all([child.output(), writeP]);

  if (!out.success) {
    throw new Error(
      `OpenSCAD failed with code ${out.code}:\n` +
        new TextDecoder().decode(out.stderr),
    );
  }

  return out.stdout;
}

interface JupyterConfig {
  /**
   * Height of the preview viewport, in pixels.
   */
  viewportHeight: number;
  /**
   * Background color of the preview.
   */
  backgroundColor: number;
  /**
   * Default color of objects rendered in the preview.
   */
  defaultColor: number;

  /**
   * Width of the available area (a square), in mm.
   */
  gridSize: number;
}

const jupyterConfig: JupyterConfig = {
  viewportHeight: 100,
  backgroundColor: 0xffffff,
  defaultColor: 0xaaaa00,
  gridSize: 200,
};

export function configureJupyter(config: Partial<JupyterConfig>) {
  Object.assign(jupyterConfig, config);
}

function stlToHTML(stl: Uint8Array) {
  const uuid = crypto.randomUUID();

  return {
    "text/html": /*html*/ `
      <div
        id="${uuid}"
        data-config="${JSON.stringify(jupyterConfig).replaceAll('"', "&quot;")}"
        data-stl="${stl.toBase64()}"
        style="height: ${jupyterConfig.viewportHeight}px"
      ></div>
      <script type="module">
        import * as THREE from "https://esm.sh/three@0.181.2";
        import { STLLoader } from "https://esm.sh/three@0.181.2/addons/loaders/STLLoader.js";
        import { OrbitControls } from "https://esm.sh/three@0.181.2/addons/controls/OrbitControls.js";

        THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0,0,1);

        const container = document.getElementById("${uuid}");
        const config = JSON.parse(container.dataset.config);
        const width = container.clientWidth;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(config.backgroundColor);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, config.viewportHeight);
        container.appendChild(renderer.domElement);

        {
          const gridHelper = new THREE.GridHelper(config.gridSize, config.gridSize / 10);
          gridHelper.rotation.x = Math.PI / 2;
          scene.add(gridHelper);
        }
        {
          const axesHelper = new THREE.AxesHelper(100);
          scene.add(axesHelper);
        }

        {
          const ambientLight = new THREE.AmbientLight(0x404040, 2);
          scene.add(ambientLight);
        }
        {
          const light = new THREE.DirectionalLight(0xffffff, 10);
          light.position.set(80, 60, 100);
          scene.add(light);
        }
        {
          const light = new THREE.DirectionalLight(0xffffff, 6);
          light.position.set(-80, -60, -100);
          scene.add(light);
        }

        const camera = new THREE.PerspectiveCamera(75, width / config.viewportHeight, 0.1, 1000);
        const controls = new OrbitControls(camera, renderer.domElement);
        camera.position.set(50, 50, 50);
        controls.update();

        {
          const loader = new STLLoader();
          const geometry = loader.parse(fromBase64(container.dataset.stl).buffer);

          const color = new THREE.Color(config.defaultColor);
          const material = new THREE.MeshStandardMaterial({ color });

          const mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);
        }

        renderer.setAnimationLoop(() => {
          controls.update();
          renderer.render(scene, camera);
        });

        new ResizeObserver(() => {
          const width = container.clientWidth;
          renderer.setSize(width, config.viewportHeight);
          camera.aspect = width / config.viewportHeight;
          camera.updateProjectionMatrix();
        }).observe(container);

        function fromBase64(base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        }
      </script>
    `,
  };
}
