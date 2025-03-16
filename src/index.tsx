import React from "react";
import {
  defaultParse,
  defaultStringify,
  defaultIsEmptySearchParam,
  isWindowUndefined,
} from "./helpers";
import { useSyncExternalStore } from "use-sync-external-store/shim";

export function useStableCallback<TCb extends (...args: any[]) => any>(
  cb: TCb,
): TCb {
  const cbRef = React.useRef(cb);
  cbRef.current = cb;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(((...args) => cbRef.current(...args)) as TCb, []);
}

function useStableValue<Val>(val: Val) {
  const valRef = React.useRef(val);
  valRef.current = val;
  return React.useCallback(() => valRef.current, []);
}

interface Options<TVal> {
  /**
   * @param `unsanitized` The raw string pulled from the searchParams search param.
   * @returns The sanitized string.
   */
  sanitize?: (unsanitized: string) => string;

  /**
   * @param `unparsed` The result of `sanitize` is passed as `unparsed`.
   * @returns A parsed value of the type `TVal` i.e. the type of `defaultState`.
   */
  parse?: (unparsed: string) => TVal;

  /**
   * `validate` is expected to validate and return the `unvalidated` argument passed to it (presumably of type `TVal`), or throw an error. If an error is thrown, `onError` is called and `useSearchParamState` returns the initial state.
   *
   * @param `unvalidated` The result of `parse` is passed as `unvalidated`.
   * @returns The `unvalidated` argument, now validated as of type `TVal`.
   */
  validate?: (unvalidated: unknown) => TVal;

  /**
   * @param `valToStringify` The search param to stringify before setting it in the URL.
   * @returns The stringified search param.
   */
  stringify?: (valToStringify: TVal) => string;

  /**
   * A `boolean`.
   *
   * When calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is set to `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   */
  deleteEmptySearchParam?: boolean;

  /**
   * When calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   *
   * @param `searchParamVal` When setting the state, the new state is passed as `searchParamVal`.
   * @returns A boolean.
   */
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;

  /**
   * A value of type `string` - any valid `string` input to the `URLSearchParams` constructor.
   *
   * When passed, `serverSideSearchString` will be used when `window` is `undefined` to access the URL search param. This is useful for generating content on the server, i.e. with Next.js.
   */
  serverSideSearchString?: string;

  /**
   * @param `href` The `href` to set as the URL when calling the `setState` function returned by `useSearchParamState`.
   * @returns
   */
  pushState?: (stringifiedSearchParams: string) => void;

  /**
   * @param `e` The error caught in one of `useSearchParamState`'s `try` `catch` blocks.
   * @returns
   */
  onError?: (e: unknown) => void;

  /**
   * A React hook to return the current window.location.search. This is dependent on your router of choice.
   */
  useSearchString: (...args: unknown[]) => string;

  /**
   * A search string corresponding to window.location.search.
   */
  searchString: string;
}

// TODO: consolidate these
interface BuildUseSearchParamStateOptions<TVal> {
  sanitize?: Options<TVal>["sanitize"];
  parse?: Options<TVal>["parse"];
  stringify?: Options<TVal>["stringify"];
  deleteEmptySearchParam?: Options<TVal>["deleteEmptySearchParam"];
  isEmptySearchParam?: Options<TVal>["isEmptySearchParam"];
  pushState?: Options<TVal>["pushState"];
  onError?: Options<TVal>["onError"];
  useSearchString: Options<TVal>["useSearchString"];
}

interface UseSearchParamStateOptions<TVal> {
  sanitize?: Options<TVal>["sanitize"];
  parse?: Options<TVal>["parse"];
  validate?: Options<TVal>["validate"];
  stringify?: Options<TVal>["stringify"];
  deleteEmptySearchParam?: Options<TVal>["deleteEmptySearchParam"];
  isEmptySearchParam?: Options<TVal>["isEmptySearchParam"];
  serverSideSearchString?: Options<TVal>["serverSideSearchString"];
  pushState?: Options<TVal>["pushState"];
  onError?: Options<TVal>["onError"];
}

interface BuildGetSearchParamOptions<TVal> {
  sanitize?: Options<TVal>["sanitize"];
  parse?: Options<TVal>["parse"];
  stringify?: Options<TVal>["stringify"];
  onError?: Options<TVal>["onError"];
}
interface GetSearchParamOptions<TVal> {
  sanitize?: Options<TVal>["sanitize"];
  parse?: Options<TVal>["parse"];
  validate?: Options<TVal>["validate"];
  stringify?: Options<TVal>["stringify"];
  serverSideSearchString?: Options<TVal>["serverSideSearchString"];
  onError?: Options<TVal>["onError"];
  searchString: Options<TVal>["searchString"];
}

function buildUseSearchParamState(
  buildOptions: BuildUseSearchParamStateOptions<unknown>,
) {
  return function useSearchParamState<TVal>(
    /**
     * The name of the URL search param to read from and write to.
     *
     * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) for more info.
     */
    searchParam: string,

    /**
     * The initial state returned by `useSearchParamState` if no valid URL search param is present to read from.
     *
     * Note that if `sanitize`, `parse`, or `validate` throw an error, the initial state is set in the URL and returned by `useSearchParamState`.
     */
    defaultState: TVal,

    /**
     * Options passed by a particular instance of `useSearchParamState`.
     *
     * When an option is passed to both `useSearchParamState` and `SearchParamStateProvider`, only the option passed to `useSearchParamState` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    hookOptions: UseSearchParamStateOptions<TVal> = {},
  ) {
    const { useSearchString } = buildOptions;
    const searchString = useSearchString();

    const stringifyOption =
      hookOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const parseOption =
      hookOptions.parse ??
      (buildOptions.parse as Required<Options<TVal>>["parse"]) ??
      (defaultParse as Required<Options<TVal>>["parse"]);
    const pushStateOption =
      hookOptions.pushState ??
      buildOptions.pushState ??
      ((stringifiedSearchParams: string) => {
        window.history.pushState({}, "", stringifiedSearchParams);
      });
    const sanitizeOption =
      hookOptions.sanitize ??
      buildOptions.sanitize ??
      ((unsanitized: string) => unsanitized);
    const deleteEmptySearchParam =
      hookOptions.deleteEmptySearchParam ??
      buildOptions.deleteEmptySearchParam ??
      false;
    const isEmptySearchParamOption =
      hookOptions.isEmptySearchParam ??
      buildOptions.isEmptySearchParam ??
      defaultIsEmptySearchParam;
    const validateOption =
      hookOptions.validate ?? ((unvalidated: unknown) => unvalidated as TVal);
    const buildOnErrorOption = buildOptions.onError ?? (() => {});
    const hookOnErrorOption = hookOptions.onError ?? (() => {});
    const { serverSideSearchString } = hookOptions;

    // necessary to return referentially stable values so the consumer can pass them to dep arrays
    const stringify = useStableCallback(stringifyOption);
    const parse = useStableCallback(parseOption);
    const pushState = useStableCallback(pushStateOption);
    const sanitize = useStableCallback(sanitizeOption);
    const isEmptySearchParam = useStableCallback(isEmptySearchParamOption);
    const validate = useStableCallback(validateOption);
    const buildOnError = useStableCallback(buildOnErrorOption);
    const hookOnError = useStableCallback(hookOnErrorOption);
    const getDefaultState = useStableValue(defaultState);

    const searchParamVal =
      React.useMemo(
        () =>
          _getSearchParamVal<TVal>({
            searchString,
            sanitize,
            localOnError: hookOnError,
            buildOnError,
            searchParam,
            validate,
            parse,
            serverSideSearchString,
          }),
        [
          buildOnError,
          hookOnError,
          parse,
          sanitize,
          searchParam,
          searchString,
          serverSideSearchString,
          validate,
        ],
      ) ?? getDefaultState();

    const setSearchParam = React.useCallback(
      (val: TVal | ((currVal: TVal) => TVal)) => {
        let valToSet: TVal;
        if (val instanceof Function) {
          valToSet = val(searchParamVal);
        } else {
          valToSet = val;
        }

        try {
          const search = maybeGetSearch({
            serverSideSearchString,
            searchString,
          });
          if (search === null) {
            throw new Error();
          }

          const searchParamsObj = new URLSearchParams(search);

          if (deleteEmptySearchParam && isEmptySearchParam(valToSet)) {
            searchParamsObj.delete(searchParam);
            if (searchParamsObj.toString().length > 0) {
              // URLSearchParams.toString() does not include a `?`
              pushState(`?${searchParamsObj.toString()}`);
            }
          }

          const stringified = stringify(valToSet);
          searchParamsObj.set(searchParam, stringified);
          if (searchParamsObj.toString().length > 0) {
            // URLSearchParams.toString() does not include a `?`
            pushState(`?${searchParamsObj.toString()}`);
          }
        } catch (e) {
          hookOnError(e);
          buildOnError(e);
        }
      },
      [
        buildOnError,
        deleteEmptySearchParam,
        hookOnError,
        isEmptySearchParam,
        pushState,
        searchParam,
        searchParamVal,
        searchString,
        serverSideSearchString,
        stringify,
      ],
    );

    return [searchParamVal, setSearchParam] as const;
  };
}

function maybeGetSearch({
  serverSideSearchString,
  searchString,
}: {
  serverSideSearchString: Options<unknown>["serverSideSearchString"];
  searchString: string;
}) {
  if (isWindowUndefined()) {
    if (typeof serverSideSearchString === "string") {
      return serverSideSearchString;
    }
    return null;
  }
  return searchString;
}

function buildGetSearchParam(
  buildOptions: BuildGetSearchParamOptions<unknown> = {},
) {
  return function getSearchParam<TVal>(
    /**
     * The name of the URL search param to read from.
     *
     * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) for more info.
     */
    searchParam: string,
    /**
     * Options passed by a particular instance of `getSearchParam`.
     *
     * When an option is passed to both `getSearchParam` and `buildGetSearchParam`, only the option passed to `getSearchParam` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    localOptions: GetSearchParamOptions<TVal> = {
      searchString: window.location.search,
    },
  ) {
    const parse =
      localOptions.parse ??
      (buildOptions.parse as Required<Options<TVal>>["parse"]) ??
      (defaultParse as Required<Options<TVal>>["parse"]);
    const sanitize =
      localOptions.sanitize ??
      buildOptions.sanitize ??
      ((unsanitized: string) => unsanitized);
    const validate =
      localOptions.validate ?? ((unvalidated: unknown) => unvalidated as TVal);
    const { serverSideSearchString, searchString } = localOptions;

    return _getSearchParamVal({
      serverSideSearchString,
      searchString,
      sanitize,
      parse,
      validate,
      searchParam,
      buildOnError: buildOptions.onError,
      localOnError: localOptions.onError,
    });
  };
}

function _getSearchParamVal<TVal>({
  searchString,
  searchParam,
  serverSideSearchString,
  sanitize,
  parse,
  validate,
  buildOnError,
  localOnError,
}: {
  searchParam: string;
  searchString: Options<TVal>["searchString"];
  serverSideSearchString: Options<TVal>["serverSideSearchString"];
  sanitize: Required<Options<TVal>>["sanitize"];
  parse: Required<Options<TVal>>["parse"];
  validate: Required<Options<TVal>>["validate"];
  buildOnError: Options<TVal>["onError"];
  localOnError: Options<TVal>["onError"];
}) {
  try {
    const getSearch = () => {
      if (isWindowUndefined()) {
        if (typeof serverSideSearchString === "string") {
          return serverSideSearchString;
        }
        return null;
      }
      return searchString;
    };
    const search = getSearch();

    if (search === null) {
      return null;
    }

    const urlParams = new URLSearchParams(search);
    const rawSearchParamVal = urlParams.get(searchParam);
    if (rawSearchParamVal === null) {
      return null;
    }

    const sanitized = sanitize(rawSearchParamVal);
    const parsed = parse(sanitized);
    const validated = validate(parsed);

    return validated;
  } catch (e) {
    buildOnError?.(e);
    localOnError?.(e);
    return null;
  }
}

function useSearchString() {
  const customEventNames = ["pushState", "replaceState"] as const;
  const eventNames = ["popstate", ...customEventNames] as const;

  // from Wouter: https://github.com/molefrog/wouter/blob/110b6694a9b3220460eed32640fa4778d10bdf52/packages/wouter/src/use-browser-location.js#L57
  const patchKey = Symbol.for("use-search-param-state");
  if (
    typeof history !== "undefined" &&
    // @ts-expect-error type issues indexing with a symbol
    typeof window[patchKey] === "undefined"
  ) {
    for (const eventName of customEventNames) {
      const original = history[eventName];
      history[eventName] = function (...args) {
        dispatchEvent(new Event(eventName));
        return original.apply(this, args);
      };
    }
    Object.defineProperty(window, patchKey, { value: true });
  }

  const subscribeToEventUpdates = (callback: (event: Event) => void) => {
    for (const eventName of eventNames) {
      window.addEventListener(eventName, callback);
    }
    return () => {
      for (const eventName of eventNames) {
        window.removeEventListener(eventName, callback);
      }
    };
  };

  const getSnapshot = () => window.location.search;

  return useSyncExternalStore(
    subscribeToEventUpdates,
    getSnapshot,
    getSnapshot,
  );
}

const getSearchParam = buildGetSearchParam();
const useSearchParamState = buildUseSearchParamState();

export {
  buildUseSearchParamState,
  useSearchParamState,
  buildGetSearchParam,
  getSearchParam,
  useSearchString,
};
export type { UseSearchParamStateOptions, BuildUseSearchParamStateOptions };
