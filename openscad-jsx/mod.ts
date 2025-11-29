import type { JSX } from "./types.ts";

import IntrinsicCADElement, * as intrinsics from "./intrinsics.ts";

const aliases: {
  [Type in keyof JSX.IntrinsicElements]: {
    new (props: JSX.IntrinsicElements[Type]): IntrinsicCADElement<object>;
  };
} = {
  circle: intrinsics.Circle,
  color: intrinsics.Color,
  cube: intrinsics.Cube,
  cuboid: intrinsics.Cuboid,
  cylinder: intrinsics.Cylinder,
  difference: intrinsics.Difference,
  extrusionLinear: intrinsics.ExtrusionLinear,
  extrusionRotational: intrinsics.ExtrusionRotational,
  hull: intrinsics.Hull,
  intersection: intrinsics.Intersection,
  minkowski: intrinsics.Minkowski,
  mirror: intrinsics.Mirror,
  multiply: intrinsics.Multiply,
  offset: intrinsics.Offset,
  projection: intrinsics.Projection,
  rectangle: intrinsics.Rectangle,
  regularPolygon: intrinsics.RegularPolygon,
  regularPrism: intrinsics.RegularPrism,
  resize: intrinsics.Resize,
  rotate: intrinsics.Rotate,
  rotateXYZ: intrinsics.RotateXYZ,
  scale: intrinsics.Scale,
  sphere: intrinsics.Sphere,
  square: intrinsics.Square,
  translate: intrinsics.Translate,
  union: intrinsics.Union,
};

export function renderToString(element: JSX.Element): string {
  let { type, props } = element;
  if (typeof type === "string") {
    type = aliases[type] as typeof IntrinsicCADElement;
  }

  if (type.prototype instanceof IntrinsicCADElement) {
    const instance = new (type as new (
      props: object
    ) => IntrinsicCADElement<object>)(props);
    return instance.renderToString(renderToString);
  }

  return renderToString((type as (props: object) => JSX.Element)(props));
}

export type { ComponentChildren } from "./types.ts";
