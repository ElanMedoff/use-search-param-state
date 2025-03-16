// issues mocking window itself as undefined, interferes with the test runner
export function isWindowUndefined() {
  return typeof window === "undefined";
}

export function defaultParse(unparsed: string): unknown {
  // JSON.parse errors on "undefined"
  if (unparsed === "undefined") return undefined;

  try {
    return JSON.parse(unparsed);
  } catch {
    return unparsed;
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
