// issues mocking window itself as undefined, interferes with the test runner
export function isWindowUndefined() {
  return typeof window === "undefined";
}

export function defaultParse(unparsed: string) {
  if (unparsed === "null") return null;
  if (unparsed === "undefined") return undefined;
  if (unparsed === "true") return true;
  if (unparsed === "false") return false;

  const maybeNum = parseFloat(unparsed);
  if (!Number.isNaN(maybeNum)) return maybeNum;

  try {
    return JSON.parse(unparsed);
  } catch {
    return unparsed;
  }
}

export function defaultStringify<T>(valToStringify: T) {
  // avoid wrapping strings in quotes
  if (typeof valToStringify === "string") return valToStringify;
  return JSON.stringify(valToStringify);
}

export function defaultIsEmptySearchParam<T>(searchParamVal: T) {
  return (
    searchParamVal === null ||
    searchParamVal === undefined ||
    searchParamVal === ""
  );
}
