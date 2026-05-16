import type { ComponentChildren, JSX } from "./types.ts";

export default abstract class IntrinsicCADElement<Props extends object> {
  #props: Props;

  constructor(props: Props) {
    this.#props = props;
  }

  get props() {
    return this.#props;
  }

  abstract renderToString(renderChild: (child: JSX.Element) => string): string;
}

function renderElementsList(
  elements: ComponentChildren,
  renderElement: (child: JSX.Element) => string,
): string {
  return Array.isArray(elements)
    ? "{" + elements.map(renderElement).join("") + "}"
    : renderElement(elements);
}

function apply(
  name: string,
  params: (string | number | boolean | null)[],
  child: string = ";",
): string {
  const filtered = params.filter((p) => p !== null);
  return `${name}(${filtered.join(",")})${child}`;
}

/*====================================================================*\
|                               3D shapes                              |
\*====================================================================*/

export class Cube extends IntrinsicCADElement<{
  size: number;
  center?: boolean;
}> {
  override renderToString(): string {
    const { size, center } = this.props;
    return apply("cube", [size, center || null]);
  }
}

export class Cuboid extends IntrinsicCADElement<{
  sx: number;
  sy: number;
  sz: number;
  center?: boolean;
}> {
  override renderToString(): string {
    const { sx, sy, sz, center } = this.props;
    return apply("cube", [`[${sx},${sy},${sz}]`, center || null]);
  }
}

export class Sphere extends IntrinsicCADElement<{ r: number }> {
  override renderToString(): string {
    return apply("sphere", [this.props.r]);
  }
}

type OneOrTwoRadius<T extends object> =
  | (T & { r: number; topRadius?: never; bottomRadius?: never })
  | (T & { r?: never; topRadius: number; bottomRadius: number });

export class Cylinder extends IntrinsicCADElement<
  OneOrTwoRadius<{ h: number; center?: boolean; $fn?: number }>
> {
  override renderToString(): string {
    const { r, topRadius, bottomRadius, h, center, $fn } = this.props;
    if (r !== undefined) {
      return apply("cylinder", [
        `h=${h}`,
        `r=${r}`,
        center ? `center=true` : null,
        $fn ? `$fn=${$fn}` : null,
      ]);
    } else {
      return apply("cylinder", [
        h,
        bottomRadius,
        topRadius,
        center ? `center=true` : null,
        $fn ? `$fn=${$fn}` : null,
      ]);
    }
  }
}

export class RegularPrism extends IntrinsicCADElement<
  OneOrTwoRadius<{ sides: number; h: number; center?: boolean }>
> {
  override renderToString(): string {
    const { sides, r, topRadius = r, bottomRadius = r, h, center } = this.props;
    return apply("cylinder", [
      h,
      bottomRadius!,
      topRadius!,
      center ? "center=true" : null,
      `$fn=${sides}`,
    ]);
  }
}

export class Polyhedron extends IntrinsicCADElement<{
  points: [number, number, number][];
  children: (...points: number[]) => number[][];
}> {
  override renderToString(): string {
    const { points, children } = this.props;
    const pointsStr = points.map((p) => `[${p[0]},${p[1]},${p[2]}]`).join(",");
    const facesStr = children(
      ...Array.from({ length: points.length }, (_, i) => i),
    )
      .map((f) => `[${f.join(",")}]`)
      .join(",");
    return apply("polyhedron", [
      `points=[${pointsStr}]`,
      `faces=[${facesStr}]`,
    ]);
  }
}

/*====================================================================*\
|                               2D shapes                              |
\*====================================================================*/

export class Square extends IntrinsicCADElement<{
  size: number;
  center?: boolean;
}> {
  override renderToString(): string {
    const { size, center } = this.props;
    return apply("square", [size, center || null]);
  }
}

export class Rectangle extends IntrinsicCADElement<{
  sx: number;
  sy: number;
  center?: boolean;
}> {
  override renderToString(): string {
    const { sx, sy, center } = this.props;
    return apply("square", [`[${sx},${sy}]`, center || null]);
  }
}

export class Circle extends IntrinsicCADElement<{ r: number; $fn?: number }> {
  override renderToString(): string {
    return apply("circle", [
      this.props.r,
      this.props.$fn ? `$fn=${this.props.$fn}` : null,
    ]);
  }
}

export class RegularPolygon extends IntrinsicCADElement<{
  sides: number;
  r: number;
}> {
  override renderToString(): string {
    const { sides, r } = this.props;
    return apply("circle", [r, `$fn=${sides}`]);
  }
}

export class Polygon extends IntrinsicCADElement<{
  points: readonly (readonly [number, number])[];
}> {
  override renderToString(): string {
    const { points } = this.props;
    const pointsStr = points.map((p) => `[${p[0]},${p[1]}]`).join(",");
    return apply("polygon", [`points=[${pointsStr}]`]);
  }
}

/*====================================================================*\
|                               3D <-> 2D                              |
\*====================================================================*/

export class Projection extends IntrinsicCADElement<{
  cut?: boolean;
  children: JSX.Element;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { cut } = this.props;
    return apply(
      "projection",
      [cut ? "cut=true" : null],
      renderChild(this.props.children),
    );
  }
}

export class ExtrusionLinear extends IntrinsicCADElement<{
  children: JSX.Element;
  h: number;
  center?: boolean;
  twist?: number;
  scale?: number;
  slices?: number;
  segments?: number;
  convexity?: number;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { h, center, twist, scale, slices, segments, convexity, children } =
      this.props;

    return apply(
      "linear_extrude",
      [
        `height=${h}`,
        center ? "center=true" : null,
        twist !== undefined ? `twist=${twist}` : null,
        scale !== undefined ? `scale=${scale}` : null,
        slices !== undefined ? `slices=${slices}` : null,
        segments !== undefined ? `segments=${segments}` : null,
        convexity !== undefined ? `convexity=${convexity}` : null,
      ],
      renderChild(children),
    );
  }
}

export class ExtrusionRotational extends IntrinsicCADElement<{
  children: JSX.Element;
  angle?: number;
  convexity?: number;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { angle, convexity, children } = this.props;

    return apply(
      "rotate_extrude",
      [
        angle !== undefined ? `angle=${angle}` : null,
        convexity !== undefined ? `convexity=${convexity}` : null,
      ],
      renderChild(children),
    );
  }
}

/*====================================================================*\
|                             Transforms                               |
\*====================================================================*/

export class Scale extends IntrinsicCADElement<{
  x: number;
  y: number;
  z: number;
  children: ComponentChildren;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { x, y, z, children } = this.props;
    return apply(
      "scale",
      [`[${x},${y},${z}]`],
      renderElementsList(children, renderChild),
    );
  }
}

export class Resize extends IntrinsicCADElement<
  (
    | { x: number; y?: number | "auto"; z?: number | "auto" }
    | { x?: number | "auto"; y: number; z?: number | "auto" }
    | { x?: number | "auto"; y?: number | "auto"; z: number }
  ) & {
    children: ComponentChildren;
  }
> {
  #newsize(val: number | "auto" | undefined): number {
    if (val === undefined || val === "auto") {
      return 0;
    }
    return val;
  }
  #auto(val: number | "auto" | undefined): boolean {
    return val === "auto";
  }

  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { x, y, z, children } = this.props;
    return apply(
      "scale",
      [
        `[${this.#newsize(x)},${this.#newsize(y)},${this.#newsize(z)}]`,
        `auto=[${this.#auto(x)},${this.#auto(y)},${this.#auto(z)}]`,
      ],
      renderElementsList(children, renderChild),
    );
  }
}

export class Rotate extends IntrinsicCADElement<{
  by: number;
  axis?: [number, number, number];
  children: ComponentChildren;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { by, axis, children } = this.props;
    return apply(
      "rotate",
      [by, axis ? `[${axis[0]},${axis[1]},${axis[2]}]` : null],
      renderElementsList(children, renderChild),
    );
  }
}

export class RotateXYZ extends IntrinsicCADElement<
  (
    | { x: number; y?: number; z?: number }
    | { x?: number; y: number; z?: number }
    | { x?: number; y?: number; z: number }
  ) & {
    children: ComponentChildren;
  }
> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { x = 0, y = 0, z = 0, children } = this.props;
    return apply(
      "rotate",
      [`[${x},${y},${z}]`],
      renderElementsList(children, renderChild),
    );
  }
}

export class Translate extends IntrinsicCADElement<
  (
    | { x: number; y?: number; z?: number }
    | { x?: number; y: number; z?: number }
    | { x?: number; y?: number; z: number }
  ) & {
    children: ComponentChildren;
  }
> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { x = 0, y = 0, z = 0, children } = this.props;
    return apply(
      "translate",
      [`[${x},${y},${z}]`],
      renderElementsList(children, renderChild),
    );
  }
}

export class Mirror extends IntrinsicCADElement<{
  plane: [number, number, number];
  children: ComponentChildren;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { plane, children } = this.props;
    return apply(
      "mirror",
      [`[${plane[0]},${plane[1]},${plane[2]}]`],
      renderElementsList(children, renderChild),
    );
  }
}

export class Multiply extends IntrinsicCADElement<{
  matrix: [
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
    [number, number, number, number],
  ];
  children: ComponentChildren;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { matrix, children } = this.props;
    const matrixStr = matrix.map((row) => `[${row.join(",")}]`).join(",");
    return apply(
      "multmatrix",
      [`m=[${matrixStr}]`],
      renderElementsList(children, renderChild),
    );
  }
}

export class Color extends IntrinsicCADElement<
  (
    | { name: string; r?: never; g?: never; b?: never }
    | { name?: never; r: number; g: number; b: number }
  ) & {
    a?: number;
    children: ComponentChildren;
  }
> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { children, name, r, g, b, a } = this.props;
    return apply(
      "color",
      [
        name !== undefined ? `"${name}"` : `c=[${r},${g},${b}]`,
        a !== undefined && a < 1 ? `a=${a}` : null,
      ],
      renderElementsList(children, renderChild),
    );
  }
}

export class Offset extends IntrinsicCADElement<{
  r: number;
  chamfer?: boolean;
  children: ComponentChildren;
}> {
  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { r, chamfer, children } = this.props;
    return apply(
      "offset",
      [r, chamfer ? "chamfer=true" : null],
      renderElementsList(children, renderChild),
    );
  }
}

/*====================================================================*\
|                        Children composition                          |
\*====================================================================*/

abstract class CompositeIntrinsicCADElement<
  Props extends { children: JSX.Element[] } = { children: JSX.Element[] },
> extends IntrinsicCADElement<Props> {
  abstract get operatorName(): string;

  override renderToString(renderChild: (child: JSX.Element) => string): string {
    const { children } = this.props;
    return apply(
      this.operatorName,
      [],
      renderElementsList(children, renderChild),
    );
  }
}

export class Union extends CompositeIntrinsicCADElement {
  override get operatorName(): string {
    return "union";
  }
}

export class Intersection extends CompositeIntrinsicCADElement {
  override get operatorName(): string {
    return "intersection";
  }
}

export class Difference extends CompositeIntrinsicCADElement<{
  children: [JSX.Element, JSX.Element, ...JSX.Element[]];
}> {
  override get operatorName(): string {
    return "difference";
  }
}

export class Minkowski extends CompositeIntrinsicCADElement {
  override get operatorName(): string {
    return "minkowski";
  }
}

export class Hull extends CompositeIntrinsicCADElement {
  override get operatorName(): string {
    return "hull";
  }
}
