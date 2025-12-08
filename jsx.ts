import type { JSX } from "./types.ts";

export function jsx(type: JSX.Element["type"], props: object): JSX.Element {
  return { type, props };
}
export function jsxs(type: JSX.Element["type"], props: object): JSX.Element {
  return { type, props };
}

export { Union as Fragment } from "./intrinsics.ts";

export type { JSX };
