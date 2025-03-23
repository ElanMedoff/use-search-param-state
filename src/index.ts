import React from "react";
import {
  defaultParse,
  defaultStringify,
  defaultIsEmptySearchParam,
  isWindowUndefined,
  defaultPushState,
  defaultSanitize,
  defaultValidate,
  defaultOnError,
  useStableValue,
  useStableCallback,
  defaultReplaceState,
  defaultGetURLSearchParams,
} from "./helpers";
import { buildUseURLSearchParams } from "./build-use-url-search-params";

interface Options<TVal> {
  /**
   * `onError` defaults to the following function:
   *
   * ```ts
   * export function defaultOnError(_e: unknown) {
   *   return;
   * }
   * ```
   *
   * `onError` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `onError` is passed to both, both `onError` functions are called. The same applies
   * to `getSearchParam`,`buildGetSearchParam`, `setSearchParam`, and `buildSetSearchParam`.
   *
   * @param `error` The error caught in one of `try` `catch` blocks.
   * @returns
   */
  onError?: (error: unknown) => void;

  /**
   * When passed, `serverSideURLSearchParams` will be used when `window` is `undefined` to
   * access the URL search param. This is useful for generating content on the server,
   * i.e. with Next.js or Remix.
   *
   * `serverSideURLSearchParams` has no default.
   *
   * `validate` can only be passed to `useSearchParamState`/`getSearchParam`, not
   * `buildUseSearchParamState`/`buildGetSearchParam`.
   *
   * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
   * object for more info.
   */
  serverSideURLSearchParams?: URLSearchParams;

  /**
   * `sanitize` defaults to the following function:
   *
   * ```ts
   * const defaultSanitize = (unsanitized: string) => unsanitized;
   * ```
   *
   * `sanitize` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `sanitize` is passed to both, only the option passed to `useSearchParamState` is
   * respected. The same applies to `getSearchParam` and `buildGetSearchParam`.
   *
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the
   * default state. If using `getSearchParam`, `null` is returned.
   *
   * @param `unsanitized` The raw string pulled from the URL search param.
   * @returns The sanitized string.
   */
  sanitize?: (unsanitized: string) => string;

  /**
   *
   * `parse` defaults to the following function:
   *
   * ```ts
   * export function defaultParse<TVal>(unparsed: string): TVal {
   *   // JSON.parse errors on "undefined"
   *   if (unparsed === "undefined") return undefined as TVal;
   *
   *   try {
   *     return JSON.parse(unparsed) as TVal;
   *   } catch {
   *     return unparsed as TVal;
   *   }
   * }
   * ```
   *
   * `parse` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `parse` is passed to both, only the option passed to `useSearchParamState` is
   * respected. The same applies to `getSearchParam` and `buildGetSearchParam`.
   *
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the
   * default state. If using `getSearchParam`, `null` is returned.
   *
   * @param `unparsed` The result of `sanitize` is passed as `unparsed`.
   * @returns A parsed value of the type `TVal` i.e. the type of `initialState`.
   */
  parse?: (unparsed: string) => TVal;

  /**
   * `validate` is expected to validate and return the `unvalidated` argument passed to it
   * (presumably of type `TVal`), or throw an error.
   *
   * `validate` defaults to the following function:
   *
   * ```
   * const defaultValidate = <TVal>(unvalidated: unknown) => unvalidated as TVal;
   * ```
   *
   * `validate` can only be passed to `useSearchParamState`/`getSearchParam`, not
   * `buildUseSearchParamState`/`buildGetSearchParam`.
   *
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the
   * default state. If using `getSearchParam`, `null` is returned.
   *
   * @param `unvalidated` The result of `parse` is passed as `unvalidated`.
   * @returns The `unvalidated` argument, now validated as of type `TVal`.
   */
  validate?: (unvalidated: unknown) => TVal;

  /**
   * `stringify` defaults to the following function:
   *
   * ```ts
   * export function defaultStringify<TVal>(valToStringify: TVal) {
   *   // avoid wrapping strings in quotes
   *   if (typeof valToStringify === "string") return valToStringify;
   *   return JSON.stringify(valToStringify);
   * }
   * ```
   *
   * `stringify` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `stringify` is passed to both, only the option passed to `useSearchParamState` is
   * respected. The same applies to `setSearchParam` and `buildSetSearchParam`
   *
   * @param `valToStringify` The search param to stringify before setting it in the URL.
   * @returns The stringified search param.
   */
  stringify?: (valToStringify: TVal) => string;

  /**
   * When setting the search param, if `deleteEmptySearchParam` is set to `true` and
   * `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   *
   * `deleteEmptySearchParam` defaults to `false`.
   *
   * `deleteEmptySearchParam` can be passed to both `useSearchParamState` and
   * `buildUseSearchParamState`. If `deleteEmptySearchParam` is passed to both, only the
   * option passed to `useSearchParamState` is respected. The same applies to
   * `setSearchParam` and `buildSetSearchParam`.
   */
  deleteEmptySearchParam?: boolean;

  /**
   * When setting the search param, if `deleteEmptySearchParam` is `true` and
   * `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   *
   * `isEmptySearchParam` defaults to the following function:
   *
   * ```ts
   * export function defaultIsEmptySearchParam<TVal>(searchParamVal: TVal) {
   *  return (
   *    searchParamVal === null ||
   *    searchParamVal === undefined ||
   *    searchParamVal === ""
   *  );
   * }
   * ```
   * `isEmptySearchParam` can be passed to both `useSearchParamState` and
   * `buildUseSearchParamState`. If `isEmptySearchParam` is passed to both, only the
   * option passed to `useSearchParamState` is respected. The same applies to
   * `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `searchParamVal` When setting the state, the new state is passed as
   * `searchParamVal`.
   * @returns A boolean.
   */
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;

  /**
   * `pushState` defaults to the following function:
   *
   * ```ts
   * function defaultPushState(urlSearchParams: URLSearchParams) {
   *  const maybeQuestionMark = urlSearchParams.toString().length ? "?" : "";
   *  window.history.pushState(
   *    {},
   *    "",
   *    `${maybeQuestionMark}${urlSearchParams.toString()}`,
   *  );
   *}
   * ```
   *
   * `pushState` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `pushState` is passed to both, only the option passed to `useSearchParamState` is
   * respected. The same applies to `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `urlSearchParams` The `urlSearchParams` to set
   * returned by `useSearchParamState`.
   * @returns
   */
  pushState?: (urlSearchParams: URLSearchParams) => void;

  /**
   * `replaceState` defaults to the following function:
   *
   * ```ts
   * function defaultReplaceState(urlSearchParams: URLSearchParams) {
   *   const maybeQuestionMark = urlSearchParams.toString().length ? "?" : "";
   *   window.history.replaceState(
   *     {},
   *     "",
   *     `${maybeQuestionMark}${urlSearchParams.toString()}`,
   *   );
   * }
   * ```
   *
   * `replaceState` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `replaceState` is passed to both, only the option passed to `useSearchParamState`
   * is respected. The same applies to `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `urlSearchParams` The `urlSearchParams` to set
   * returned by `useSearchParamState` with the `replace` option as `true`.
   * @returns
   */
  replaceState?: (urlSearchParams: URLSearchParams) => void;

  /**
   * If the search param state resolves to `null`, the URL is replaced with the search
   * param set as the `initialState` option.
   *
   * `enableSetInitialSearchParam` defaults to `true`
   *
   * `enableSetInitialSearchParam` can be passed to both `useSearchParamState` and
   * `buildUseSearchParamState`. If `enableSetInitialSearchParam` is passed to both, only
   * the option passed to `useSearchParamState` is respected.
   */
  enableSetInitialSearchParam?: boolean;

  /**
   * If `true`, when setting the search param, the updated URL will replace the top item
   * in the history stack instead of pushing to it.
   *
   * See MDN's documentation on [replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
   * for more info.
   */
  replace?: boolean;

  /**
   * A React hook to return the current URL. This hook is expected to re-render when the
   * URL changes.
   *
   * The hook to pass will depend on your routing library. A basic `useURLSearchParams`
   * hook is exported by `use-search-param-state/use-url-search-params` for your
   * convenience.
   *
   * `useURLSearchParams` defaults to the `useURLSearchParams` hook exported at
   * `'use-search-param-state/use-url-search-params'`
   *
   * `useURLSearchParams` can only be passed to `buildUseSearchParamState`, not
   * `useSearchParamState`.
   *
   * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
   * object for more info.
   */
  useURLSearchParams?: () => URLSearchParams;

  /**
   * A function to return the current URL object.
   *
   * `getURLSearchParams` defaults to the following function
   *
   * ```ts
   * const defaultGetURLSearchParams = () => new URLSearchParams(window.location.search);
   * ```
   *
   * `getURLSearchParams` can only be passed to `buildGetSearchParam` and
   * `buildSetSearchParam`, not `getSearchParam` nor `setSearchParam`.
   *
   * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
   * object for more info.
   */
  getURLSearchParams?: () => URLSearchParams;
}

interface CommonOptions<TVal> {
  onError?: Options<TVal>["onError"];
}

interface ReadBuildOptions<TVal> {
  sanitize?: Options<TVal>["sanitize"];
  parse?: Options<TVal>["parse"];
}

type ReadLocalOptions<TVal> = ReadBuildOptions<TVal> & {
  validate?: Options<TVal>["validate"];
  serverSideURLSearchParams?: Options<TVal>["serverSideURLSearchParams"];
};

interface WriteOptions<TVal> {
  deleteEmptySearchParam?: Options<TVal>["deleteEmptySearchParam"];
  isEmptySearchParam?: Options<TVal>["isEmptySearchParam"];
  pushState?: Options<TVal>["pushState"];
  replaceState?: Options<TVal>["replaceState"];
  stringify?: Options<TVal>["stringify"];
}

type BuildUseSearchParamStateOptions<TVal> = CommonOptions<TVal> &
  ReadBuildOptions<TVal> &
  WriteOptions<TVal> & {
    useURLSearchParams?: Options<TVal>["useURLSearchParams"];
    enableSetInitialSearchParam?: Options<TVal>["enableSetInitialSearchParam"];
  };

type UseSearchParamStateOptions<TVal> = CommonOptions<TVal> &
  ReadLocalOptions<TVal> &
  WriteOptions<TVal> & {
    enableSetInitialSearchParam?: Options<TVal>["enableSetInitialSearchParam"];
  };

type BuildGetSearchParamOptions<TVal> = CommonOptions<TVal> &
  ReadBuildOptions<TVal> & {
    getURLSearchParams?: Options<TVal>["getURLSearchParams"];
  };

type GetSearchParamOptions<TVal> = CommonOptions<TVal> & ReadLocalOptions<TVal>;

type BuildSetSearchParamOptions<TVal> = CommonOptions<TVal> &
  WriteOptions<TVal> & {
    getURLSearchParams?: Options<TVal>["getURLSearchParams"];
    replace?: Options<TVal>["replace"];
  };
type SetSearchParamOptions<TVal> = CommonOptions<TVal> &
  WriteOptions<TVal> & { replace?: Options<TVal>["replace"] };

function buildUseSearchParamState(
  buildOptions: BuildUseSearchParamStateOptions<unknown> = {},
) {
  return function useSearchParamState<TVal>(
    /**
     * The name of the URL search param to read from and write to.
     *
     * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParamsSearchParams)
     * for more info.
     */
    searchParam: string,

    /**
     * The default state returned by `useSearchParamState` if no valid URL search param is present to read from.
     *
     * Note that if `sanitize`, `parse`, or `validate` throw an error, the default state will also be returned.
     */
    initialState: TVal,

    /**
     * Options passed by a particular instance of `useSearchParamState`.
     *
     * When an option is passed to both `useSearchParamState` and `buildUseSearchParamState`, only the option passed to `useSearchParamState` is respected.
     * The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    hookOptions: UseSearchParamStateOptions<TVal> = {},
  ) {
    const useURLSearchParams =
      buildOptions.useURLSearchParams ?? buildUseURLSearchParams();
    const urlSearchParams = useURLSearchParams();

    const stringifyOption =
      hookOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const parseOption =
      hookOptions.parse ??
      (buildOptions.parse as Options<TVal>["parse"]) ??
      defaultParse;
    const pushStateOption =
      hookOptions.pushState ?? buildOptions.pushState ?? defaultPushState;
    const replaceStateOption =
      hookOptions.replaceState ??
      buildOptions.replaceState ??
      defaultReplaceState;
    const sanitizeOption =
      hookOptions.sanitize ?? buildOptions.sanitize ?? defaultSanitize;
    const deleteEmptySearchParam =
      hookOptions.deleteEmptySearchParam ??
      buildOptions.deleteEmptySearchParam ??
      false;
    const enableSetInitialSearchParam =
      hookOptions.enableSetInitialSearchParam ??
      buildOptions.enableSetInitialSearchParam ??
      true;
    const isEmptySearchParamOption =
      hookOptions.isEmptySearchParam ??
      buildOptions.isEmptySearchParam ??
      defaultIsEmptySearchParam;
    const validateOption = hookOptions.validate ?? defaultValidate;
    const buildOnErrorOption = buildOptions.onError ?? defaultOnError;
    const hookOnErrorOption = hookOptions.onError ?? defaultOnError;
    const { serverSideURLSearchParams } = hookOptions;

    // We need to return referentially stable values from `useSearchParamState` so the consumer can pass them to dep arrays.
    // This requires wrapping `searchParamVal` in a `useMemo` (since the value may not be a primitive),
    // and `setSearchParam` in a `useCallback`. In order to add everything to the two dependency arrays,
    // I wrap all non-primitives in `useStableCallback` or `useStableMemo`. Since `useStableCallback`
    // and `useStableMemo` return referentially stable values, they'll never cause the `useMemo` or `useCallback`
    // to re-calculate - which makes this approach effectively the same as omitting them from the dep arrays.
    // The difference is that once you omit one value from a dep array, it's easy to continue ignoring the lint rule and
    // omit others as well. See https://github.com/ElanMedoff/use-stable-reference for more info
    const stringify = useStableCallback(stringifyOption);
    const parse = useStableCallback(parseOption);
    const pushState = useStableCallback(pushStateOption);
    const replaceState = useStableCallback(replaceStateOption);
    const sanitize = useStableCallback(sanitizeOption);
    const isEmptySearchParam = useStableCallback(isEmptySearchParamOption);
    const validate = useStableCallback(validateOption);
    const buildOnError = useStableCallback(buildOnErrorOption);
    const hookOnError = useStableCallback(hookOnErrorOption);
    const getInitialState = useStableValue(initialState);

    const searchParamVal = React.useMemo(
      () =>
        _getSearchParam<TVal>({
          urlSearchParams,
          sanitize,
          localOnError: hookOnError,
          buildOnError,
          searchParam,
          validate,
          parse,
          serverSideURLSearchParams,
        }),
      [
        buildOnError,
        hookOnError,
        parse,
        sanitize,
        searchParam,
        serverSideURLSearchParams,
        urlSearchParams,
        validate,
      ],
    );

    const defaultedSearchParamVal = searchParamVal ?? getInitialState();

    const setSearchParam = React.useCallback(
      (
        val: TVal | ((currVal: TVal) => TVal),
        { replace = false }: { replace: Options<TVal>["replace"] } = {
          replace: false,
        },
      ) => {
        let valToSet: TVal;
        if (val instanceof Function) {
          valToSet = val(defaultedSearchParamVal);
        } else {
          valToSet = val;
        }

        _setSearchParam<TVal>({
          searchParamValToSet: valToSet,
          stringify,
          buildOnError,
          localOnError: hookOnError,
          searchParam,
          isEmptySearchParam,
          deleteEmptySearchParam,
          replaceState,
          pushState,
          replace,
          urlSearchParams,
        });
      },
      [
        buildOnError,
        defaultedSearchParamVal,
        deleteEmptySearchParam,
        hookOnError,
        isEmptySearchParam,
        pushState,
        replaceState,
        searchParam,
        stringify,
        urlSearchParams,
      ],
    );

    React.useEffect(() => {
      if (searchParamVal == null && enableSetInitialSearchParam) {
        setSearchParam(getInitialState(), { replace: true });
      }
    }, [
      enableSetInitialSearchParam,
      getInitialState,
      searchParamVal,
      setSearchParam,
    ]);

    return [defaultedSearchParamVal, setSearchParam] as const;
  };
}

function _maybeGetURL({
  serverSideURLSearchParams,
  urlSearchParams,
}: {
  serverSideURLSearchParams: Options<unknown>["serverSideURLSearchParams"];
  urlSearchParams: URLSearchParams;
}) {
  if (isWindowUndefined()) {
    if (serverSideURLSearchParams instanceof URLSearchParams) {
      return serverSideURLSearchParams;
    }
    return null;
  }
  return urlSearchParams;
}

function buildGetSearchParam(
  buildOptions: BuildGetSearchParamOptions<unknown> = {},
) {
  return function getSearchParam<TVal>(
    /**
     * The name of the URL search param to read from.
     *
     * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParamsSearchParams) for more info.
     */
    searchParam: string,
    /**
     * Options passed by a particular instance of `getSearchParam`.
     *
     * When an option is passed to both `getSearchParam` and `buildGetSearchParam`, only the option passed to `getSearchParam` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    localOptions: GetSearchParamOptions<TVal> = {},
  ) {
    const parse = localOptions.parse ?? buildOptions.parse ?? defaultParse;
    const sanitize =
      localOptions.sanitize ?? buildOptions.sanitize ?? defaultSanitize;
    const validate = localOptions.validate ?? defaultValidate;
    const buildOnError = buildOptions.onError ?? defaultOnError;
    const localOnError = localOptions.onError ?? defaultOnError;
    const getURLSearchParams =
      buildOptions.getURLSearchParams ?? defaultGetURLSearchParams;
    const { serverSideURLSearchParams } = localOptions;
    const urlSearchParams = getURLSearchParams();

    return _getSearchParam({
      serverSideURLSearchParams,
      urlSearchParams,
      sanitize,
      parse,
      validate,
      searchParam,
      buildOnError,
      localOnError,
    });
  };
}

function buildSetSearchParam(
  buildOptions: BuildSetSearchParamOptions<unknown> = {},
) {
  return function setSearchParam<TVal>(
    /**
     * The name of the URL search param to read from.
     *
     * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParamsSearchParams) for more info.
     */
    searchParam: string,
    /**
     * The value to set to the search param. The value is first passed to `stringify`, then updated in the URL.
     */
    searchParamValToSet: TVal,
    /**
     * Options passed by a particular instance of `setSearchParam`.
     *
     * When an option is passed to both `setSearchParam` and `buildSetSearchParam`, only the option passed to `setSearchParam` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    localOptions: SetSearchParamOptions<TVal> = {},
  ) {
    const stringify =
      localOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const buildOnError = buildOptions.onError ?? defaultOnError;
    const localOnError = localOptions.onError ?? defaultOnError;
    const isEmptySearchParam =
      localOptions.isEmptySearchParam ??
      buildOptions.isEmptySearchParam ??
      defaultIsEmptySearchParam;
    const deleteEmptySearchParam =
      localOptions.deleteEmptySearchParam ??
      buildOptions.deleteEmptySearchParam ??
      false;
    const replaceState =
      localOptions.replaceState ??
      buildOptions.replaceState ??
      defaultReplaceState;
    const pushState =
      localOptions.pushState ?? buildOptions.pushState ?? defaultPushState;
    const replace = localOptions.replace ?? buildOptions.replace ?? false;
    const getURLSearchParams =
      buildOptions.getURLSearchParams ?? defaultGetURLSearchParams;
    const urlSearchParams = getURLSearchParams();

    _setSearchParam({
      searchParamValToSet,
      stringify,
      buildOnError,
      localOnError,
      searchParam,
      isEmptySearchParam,
      deleteEmptySearchParam,
      replaceState,
      pushState,
      replace,
      urlSearchParams,
    });
  };
}

function _getSearchParam<TVal>({
  urlSearchParams,
  searchParam,
  serverSideURLSearchParams,
  sanitize,
  parse,
  validate,
  buildOnError,
  localOnError,
}: {
  searchParam: string;
  urlSearchParams: URLSearchParams;
  serverSideURLSearchParams: Options<TVal>["serverSideURLSearchParams"];
  sanitize: Required<Options<TVal>>["sanitize"];
  parse: Required<Options<TVal>>["parse"];
  validate: Required<Options<TVal>>["validate"];
  buildOnError: Required<Options<TVal>>["onError"];
  localOnError: Required<Options<TVal>>["onError"];
}) {
  try {
    const maybeURLSearchParams = _maybeGetURL({
      serverSideURLSearchParams,
      urlSearchParams,
    });

    if (maybeURLSearchParams === null) {
      return null;
    }

    const rawSearchParamVal = maybeURLSearchParams.get(searchParam);
    if (rawSearchParamVal === null) {
      return null;
    }

    const sanitized = sanitize(rawSearchParamVal);
    const parsed = parse(sanitized);
    const validated = validate(parsed);

    return validated;
  } catch (error) {
    buildOnError(error);
    localOnError(error);
    return null;
  }
}

function _setSearchParam<TVal>({
  searchParam,
  searchParamValToSet,
  replace,
  urlSearchParams,
  pushState,
  replaceState,
  deleteEmptySearchParam,
  isEmptySearchParam,
  localOnError,
  buildOnError,
  stringify,
}: {
  searchParam: string;
  searchParamValToSet: TVal;
  replace: boolean;
  urlSearchParams: URLSearchParams;
  pushState: Required<Options<TVal>>["pushState"];
  replaceState: Required<Options<TVal>>["replaceState"];
  deleteEmptySearchParam: Required<Options<TVal>>["deleteEmptySearchParam"];
  isEmptySearchParam: Required<Options<TVal>>["isEmptySearchParam"];
  localOnError: Required<Options<TVal>>["onError"];
  buildOnError: Required<Options<TVal>>["onError"];
  stringify: Required<Options<TVal>>["stringify"];
}) {
  const pushOrReplaceState = replace ? replaceState : pushState;

  try {
    if (urlSearchParams === null) {
      throw new Error(
        "Invalid URLSearchParams! This can occur if `useSearchParamState` is running on the server and the `serverSideURLSearchParams` option isn't passed.",
      );
    }

    if (deleteEmptySearchParam && isEmptySearchParam(searchParamValToSet)) {
      urlSearchParams.delete(searchParam);
      pushOrReplaceState(urlSearchParams);
      return;
    }

    const stringified = stringify(searchParamValToSet);
    urlSearchParams.set(searchParam, stringified);
    pushOrReplaceState(urlSearchParams);
  } catch (error) {
    localOnError(error);
    buildOnError(error);
  }
}

const setSearchParam = buildSetSearchParam();
const getSearchParam = buildGetSearchParam();
const useSearchParamState = buildUseSearchParamState();

export {
  buildUseSearchParamState,
  useSearchParamState,
  buildGetSearchParam,
  getSearchParam,
  buildSetSearchParam,
  setSearchParam,
};
export type {
  BuildUseSearchParamStateOptions,
  UseSearchParamStateOptions,
  BuildGetSearchParamOptions,
  GetSearchParamOptions,
  BuildSetSearchParamOptions,
  SetSearchParamOptions,
};
