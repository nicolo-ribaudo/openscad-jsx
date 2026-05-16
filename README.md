# openscad-jsx

Write 3D models with [JSX](https://react.dev/learn/writing-markup-with-jsx).
The component tree compiles to OpenSCAD source, which OpenSCAD then renders to
STL (or PNG previews).

```jsx
const cup = (
  <difference>
    <cylinder r={40} h={95} $fn={100} />
    <translate z={3}>
      <cylinder r={36} h={95} $fn={100} />
    </translate>
  </difference>
);
```

## Requirements

- [Deno](https://deno.com/)
- [OpenSCAD](https://openscad.org/) (must be available on `$PATH`, try running `openscad` in your terminal to check)

## Install

In a Deno project, add the dependency:

```sh
deno add jsr:@nic/openscad-jsx
```

Configure JSX in `deno.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@nic/openscad-jsx"
  }
}
```

Alternatively, set the import source per file with a pragma:

```ts
/** @jsxImportSource @nic/openscad-jsx */
```

JSX files must use the `.tsx` extension so Deno parses the JSX syntax.

## Usage

### Render to STL from a script

```tsx
/** @jsxImportSource @nic/openscad-jsx */
import { renderToSTL } from "@nic/openscad-jsx/deno";

const model = (
  <union>
    <cube size={20} center />
    <translate z={15}>
      <sphere r={8} />
    </translate>
  </union>
);

const stl = await renderToSTL(model);
Deno.writeFileSync("model.stl", stl);
```

Run with the permissions OpenSCAD needs:

```sh
deno run --allow-write --allow-run=openscad model.tsx
```

### Render to the raw OpenSCAD source

With the JSX config from above in place:

```tsx
/** @jsxImportSource @nic/openscad-jsx */
import { renderToString } from "@nic/openscad-jsx";

console.log(renderToString(<cube size={10} />));
```

### Jupyter (Deno kernel)

In a Deno Jupyter notebook, `renderToSTL` returns a value with an interactive
Three.js viewer, and `renderToImage` returns a PNG preview rendered by
OpenSCAD. (Outside Jupyter, both functions return raw `Uint8Array`s.) See
`examples/*.ipynb` for runnable notebooks.

```tsx
import {
  configureJupyter,
  renderToImage,
  renderToSTL,
} from "@nic/openscad-jsx/deno";

configureJupyter({
  viewportHeight: 300,
  backgroundColor: 0xffffff,
  defaultColor: 0xaaaa00,
  gridSize: 200,
});

await renderToImage(<sphere r={10} />);
```

The defaults are `{ viewportHeight: 100, backgroundColor: 0xffffff,
defaultColor: 0xaaaa00, gridSize: 200 }`; `configureJupyter` merges partial
overrides on top.

### Custom components

Custom components are plain functions returning JSX:

```tsx
function Washer({ r, hole, h }: { r: number; hole: number; h: number }) {
  return (
    <difference>
      <cylinder r={r} h={h} $fn={64} />
      <cylinder r={hole} h={h} $fn={64} />
    </difference>
  );
}

const part = <Washer r={10} hole={4} h={2} />;
```

For lower-level access, subclass `IntrinsicCADElement` and emit OpenSCAD
directly:

```tsx
import { IntrinsicCADElement } from "@nic/openscad-jsx";

class Text extends IntrinsicCADElement<{ value: string; size?: number }> {
  override renderToString(): string {
    const { value, size = 10 } = this.props;
    return `text("${value}", size=${size});`;
  }
}
```

## Built-in tags

All intrinsic tags map directly to OpenSCAD primitives or operators. Numeric
arguments are in OpenSCAD units (millimetres by convention). Angles are in
degrees.

### 3D shapes

#### `<cube>`

A cube centered at the origin or in the +x/+y/+z octant.

| prop     | type      | description                                  |
| -------- | --------- | -------------------------------------------- |
| `size`   | `number`  | edge length                                  |
| `center` | `boolean` | if true, centered on origin (default: false) |

```jsx
<cube size={20} center />
```

#### `<cuboid>`

A rectangular box with independent side lengths.

| prop     | type      | description                 |
| -------- | --------- | --------------------------- |
| `sx`     | `number`  | length along x              |
| `sy`     | `number`  | length along y              |
| `sz`     | `number`  | length along z              |
| `center` | `boolean` | if true, centered on origin |

#### `<sphere>`

A sphere centered at the origin.

| prop | type     | description |
| ---- | -------- | ----------- |
| `r`  | `number` | radius      |

#### `<cylinder>`

A cylinder or truncated cone. Provide either `r` for a straight cylinder, or
both `topRadius` and `bottomRadius` for a cone.

| prop           | type      | description                                     |
| -------------- | --------- | ----------------------------------------------- |
| `h`            | `number`  | height                                          |
| `r`            | `number`  | radius                                          |
| `topRadius`    | `number`  | radius at the top                               |
| `bottomRadius` | `number`  | radius at the bottom                            |
| `center`       | `boolean` | if true, centered on z=0                        |
| `$fn`          | `number`  | number of facets for the circular cross-section |

You can specify either `r` or both `topRadius` and `bottomRadius`.

#### `<regularPrism>`

A prism with a regular-polygon cross-section.

| prop           | type      | description                |
| -------------- | --------- | -------------------------- |
| `sides`        | `number`  | number of sides            |
| `h`            | `number`  | height                     |
| `r`            | `number`  | circumradius               |
| `topRadius`    | `number`  | circumradius at the top    |
| `bottomRadius` | `number`  | circumradius at the bottom |
| `center`       | `boolean` | if true, centered on z=0   |

You can specify either `r` or both `topRadius` and `bottomRadius`.

#### `<polyhedron>`

A polyhedron defined by points and faces. `children` is a function that
receives an integer index for each point in `points` and returns a list of
faces (each face being a list of indices).

| prop       | type                                   | description                   |
| ---------- | -------------------------------------- | ----------------------------- |
| `points`   | `[number, number, number][]`           | vertex coordinates            |
| `children` | `(...indices: number[]) => number[][]` | faces, as indices into points |

```jsx
<polyhedron
  points={[
    [0, 0, 0],
    [10, 0, 0],
    [10, 10, 0],
    [0, 10, 0],
    [5, 5, 10],
  ]}
>
  {(a, b, c, d, top) => [
    [a, b, c, d],
    [a, top, b],
    [b, top, c],
    [c, top, d],
    [d, top, a],
  ]}
</polyhedron>
```

### 2D shapes

#### `<square>`

A 2D square in the xy plane.

| prop     | type      | description                 |
| -------- | --------- | --------------------------- |
| `size`   | `number`  | edge length                 |
| `center` | `boolean` | if true, centered on origin |

#### `<rectangle>`

A 2D rectangle in the xy plane with independent side lengths.

| prop     | type      | description                 |
| -------- | --------- | --------------------------- |
| `sx`     | `number`  | length along x              |
| `sy`     | `number`  | length along y              |
| `center` | `boolean` | if true, centered on origin |

#### `<circle>`

A 2D disc in the xy plane, centered at the origin.

| prop  | type     | description                              |
| ----- | -------- | ---------------------------------------- |
| `r`   | `number` | radius                                   |
| `$fn` | `number` | number of facets along the circumference |

#### `<regularPolygon>`

A regular polygon in the xy plane, inscribed in a circle of radius `r`.

| prop    | type     | description     |
| ------- | -------- | --------------- |
| `sides` | `number` | number of sides |
| `r`     | `number` | circumradius    |

#### `<polygon>`

A 2D polygon from a list of vertices.

| prop     | type                          | description |
| -------- | ----------------------------- | ----------- |
| `points` | `readonly [number, number][]` | vertices    |

### 3D ↔ 2D

#### `<projection>`

Project a 3D shape onto the xy plane.

| prop  | type      | description                                                |
| ----- | --------- | ---------------------------------------------------------- |
| `cut` | `boolean` | if true, take the cross-section at z=0 instead of a shadow |

#### `<extrusionLinear>`

Extrude a 2D shape along z.

| prop        | type      | description                                    |
| ----------- | --------- | ---------------------------------------------- |
| `h`         | `number`  | extrusion height                               |
| `center`    | `boolean` | if true, centered on z=0                       |
| `twist`     | `number`  | total twist in degrees from bottom to top      |
| `scale`     | `number`  | scaling factor applied at the top              |
| `slices`    | `number`  | number of intermediate slices                  |
| `segments`  | `number`  | minimum number of segments along the extrusion |
| `convexity` | `number`  | OpenSCAD convexity hint for previewing         |

#### `<extrusionRotational>`

Rotate-extrude a 2D shape (lying in the xy plane, positive x) around the z
axis. The 2D shape's y becomes z in 3D.

| prop        | type     | description                            |
| ----------- | -------- | -------------------------------------- |
| `angle`     | `number` | sweep angle in degrees (default: 360)  |
| `convexity` | `number` | OpenSCAD convexity hint for previewing |

### Transforms

All transforms wrap their children (one or many) and apply a coordinate
transformation.

#### `<translate>`

Move children. At least one of `x`, `y`, `z` is required; missing axes default
to 0.

| prop | type     |
| ---- | -------- |
| `x`  | `number` |
| `y`  | `number` |
| `z`  | `number` |

#### `<rotate>`

Rotate children by `by` degrees around `axis` (defaults to the z axis).

| prop   | type                       | description          |
| ------ | -------------------------- | -------------------- |
| `by`   | `number`                   | rotation in degrees  |
| `axis` | `[number, number, number]` | rotation axis vector |

#### `<rotateXYZ>`

Rotate around each principal axis in turn. At least one of `x`, `y`, `z` must
be provided.

| prop | type     | description                      |
| ---- | -------- | -------------------------------- |
| `x`  | `number` | rotation around the x axis (deg) |
| `y`  | `number` | rotation around the y axis (deg) |
| `z`  | `number` | rotation around the z axis (deg) |

#### `<scale>`

Scale children along each axis. All three factors are required.

| prop | type     |
| ---- | -------- |
| `x`  | `number` |
| `y`  | `number` |
| `z`  | `number` |

#### `<resize>`

Resize children so their bounding box matches the given dimensions. Use
`"auto"` on an axis to preserve aspect ratio. At least one numeric axis is
required.

| prop | type               |
| ---- | ------------------ |
| `x`  | `number \| "auto"` |
| `y`  | `number \| "auto"` |
| `z`  | `number \| "auto"` |

#### `<mirror>`

Mirror children across the plane through the origin with the given normal.

| prop    | type                       |
| ------- | -------------------------- |
| `plane` | `[number, number, number]` |

#### `<multiply>`

Apply an arbitrary 4×4 transformation matrix.

| prop     | type           | description      |
| -------- | -------------- | ---------------- |
| `matrix` | `number[4][4]` | row-major matrix |

#### `<offset>`

Offset (grow or shrink) a 2D shape.

| prop      | type      | description                              |
| --------- | --------- | ---------------------------------------- |
| `r`       | `number`  | offset distance (negative shrinks)       |
| `chamfer` | `boolean` | if true, produce chamfered (45°) corners |

#### `<color>`

Tint children, for preview purposes. Use either a named color or RGB values
(0–1).

| prop   | type     | description                                     |
| ------ | -------- | ----------------------------------------------- |
| `name` | `string` | OpenSCAD-recognised color name                  |
| `r`    | `number` | red 0–1                                         |
| `g`    | `number` | green 0–1                                       |
| `b`    | `number` | blue 0–1                                        |
| `a`    | `number` | alpha 0–1 (optional; only emitted when `a < 1`) |

### Children composition

These operators combine their children and have no other props.

#### `<union>`

Combine all children into a single solid. Also exported as the JSX
`Fragment`, so `<>...</>` is a union.

#### `<intersection>`

Keep only the regions present in every child.

#### `<difference>`

Subtract the second-and-later children from the first. Requires at least two
children.

#### `<hull>`

The convex hull of all children.

#### `<minkowski>`

The Minkowski sum of all children. Useful for rounding shapes by hulling them
with a small sphere.

## Examples

See `examples/` for runnable Jupyter notebooks.
