import type IntrinsicCADElement from "./intrinsics.ts";
import type * as intrinsics from "./intrinsics.ts";

type IntrinsicProps<T extends IntrinsicCADElement<object>> =
  T extends IntrinsicCADElement<infer P> ? P : never;

export type ComponentChildren = JSX.Element[] | JSX.Element;

export declare namespace JSX {
  interface Element {
    type:
      | keyof IntrinsicElements
      | typeof IntrinsicCADElement
      | { (props: object): Element };
    props: object;
  }

  export interface ElementChildrenAttribute {
    children: unknown;
  }

  interface IntrinsicElements {
    circle: IntrinsicProps<intrinsics.Circle>;
    color: IntrinsicProps<intrinsics.Color>;
    cube: IntrinsicProps<intrinsics.Cube>;
    cuboid: IntrinsicProps<intrinsics.Cuboid>;
    cylinder: IntrinsicProps<intrinsics.Cylinder>;
    difference: IntrinsicProps<intrinsics.Difference>;
    extrusionLinear: IntrinsicProps<intrinsics.ExtrusionLinear>;
    extrusionRotational: IntrinsicProps<intrinsics.ExtrusionRotational>;
    hull: IntrinsicProps<intrinsics.Hull>;
    intersection: IntrinsicProps<intrinsics.Intersection>;
    minkowski: IntrinsicProps<intrinsics.Minkowski>;
    mirror: IntrinsicProps<intrinsics.Mirror>;
    multiply: IntrinsicProps<intrinsics.Multiply>;
    offset: IntrinsicProps<intrinsics.Offset>;
    polyhedron: IntrinsicProps<intrinsics.Polyhedron>;
    projection: IntrinsicProps<intrinsics.Projection>;
    rectangle: IntrinsicProps<intrinsics.Rectangle>;
    regularPolygon: IntrinsicProps<intrinsics.RegularPolygon>;
    regularPrism: IntrinsicProps<intrinsics.RegularPrism>;
    resize: IntrinsicProps<intrinsics.Resize>;
    rotate: IntrinsicProps<intrinsics.Rotate>;
    rotateXYZ: IntrinsicProps<intrinsics.RotateXYZ>;
    scale: IntrinsicProps<intrinsics.Scale>;
    sphere: IntrinsicProps<intrinsics.Sphere>;
    square: IntrinsicProps<intrinsics.Square>;
    translate: IntrinsicProps<intrinsics.Translate>;
    union: IntrinsicProps<intrinsics.Union>;
  }
}
