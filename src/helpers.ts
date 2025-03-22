import React from "react";

export function useStableCallback<TCb extends (...args: any[]) => any>(
  cb: TCb,
): TCb {
  const cbRef = React.useRef(cb);
  cbRef.current = cb;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(((...args) => cbRef.current(...args)) as TCb, []);
}

export function useStableValue<Val>(val: Val) {
  const valRef = React.useRef(val);
  valRef.current = val;
  return React.useCallback(() => valRef.current, []);
}

// issues mocking window itself as undefined, interferes with the test runner
export function isWindowUndefined() {
  return typeof window === "undefined";
}

export function defaultParse<TVal>(unparsed: string): TVal {
  // JSON.parse errors on "undefined"
  if (unparsed === "undefined") return undefined as TVal;

  try {
    return JSON.parse(unparsed) as TVal;
  } catch {
    return unparsed as TVal;
  }
}

export function defaultStringify<TVal>(valToStringify: TVal) {
  // avoid wrapping strings in quotes
  if (typeof valToStringify === "string") return valToStringify;
  return JSON.stringify(valToStringify);
}

export function defaultIsEmptySearchParam<TVal>(searchParamVal: TVal) {
  return (
    searchParamVal === null ||
    searchParamVal === undefined ||
    searchParamVal === ""
  );
}

export function defaultPushState(url: URL) {
  window.history.pushState({}, "", url);
}

export function defaultReplaceState(url: URL) {
  window.history.replaceState({}, "", url);
}

export const defaultSanitize = (unsanitized: string) => unsanitized;

export const defaultValidate = <TVal>(unvalidated: unknown) =>
  unvalidated as TVal;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function defaultOnError(_e: unknown) {
  return;
}
