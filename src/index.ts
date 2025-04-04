import React from "react";
import {
  defaultParse,
  defaultStringify,
  defaultIsEmptySearchParam,
  isWindowUndefined,
  defaultSanitize,
  defaultValidate,
  defaultOnError,
  useStableValue,
  useStableCallback,
  defaultPushURLSearchParams,
  defaultReplaceURLSearchParams,
  defaultGetURLSearchParams,
} from "./helpers";
import { buildUseURLSearchParams } from "./build-use-url-search-params";

interface CommonOptions {
  /**
   * `onError` defaults to the following function:
   *
   * ```ts
   * export function defaultOnError(_e: unknown) {
   *   return;
   * }
   * ```
   *
   * @param `error` The error caught in one of `try` `catch` blocks.
   * @returns
   */
  onError?: (error: unknown) => void;
}

interface ReadOptions<TVal> {
  /**
   * `sanitize` defaults to the following function:
   *
   * ```ts
   * const defaultSanitize = (unsanitized: string) => unsanitized;
   * ```
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
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the
   * default state. If using `getSearchParam`, `null` is returned.
   *
   * @param `unvalidated` The result of `parse` is passed as `unvalidated`.
   * @returns The `unvalidated` argument, now validated as of type `TVal`.
   */
  validate?: (unvalidated: unknown) => TVal;

  /**
   * When passed, `serverSideURLSearchParams` will be used when `window` is `undefined` to
   * access the URL search param. This is useful for generating content on the server,
   * i.e. with Next.js or Remix.
   *
   * `serverSideURLSearchParams` has no default.
   *
   * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
   * object for more info.
   */
  serverSideURLSearchParams?: URLSearchParams;
}

interface WriteOptions<TVal> {
  /**
   * When setting the search param, if `deleteEmptySearchParam` is set to `true` and
   * `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   *
   * `deleteEmptySearchParam` defaults to `false`.
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
   *
   * @param `searchParamVal` When setting the state, the new state is passed as
   * `searchParamVal`.
   * @returns A boolean.
   */
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;

  /**
   * `pushURLSearchParams` defaults to the following function:
   *
   * ```ts
   * function defaultPushURLSearchParams(urlSearchParams: URLSearchParams) {
   *  const maybeQuestionMark = urlSearchParams.toString().length ? "?" : "";
   *  window.history.pushState(
   *    {},
   *    "",
   *    `${window.location.pathname}${maybeQuestionMark}${urlSearchParams.toString()}`,
   *  );
   *}
   * ```
   *
   * @param `urlSearchParams` The `urlSearchParams` to set
   * returned by `useSearchParamState`.
   * @returns
   */
  pushURLSearchParams?: (urlSearchParams: URLSearchParams) => void;

  /**
   * `replaceURLSearchParams` defaults to the following function:
   *
   * ```ts
   * function defaultReplaceURLSearchParams(urlSearchParams: URLSearchParams) {
   *   const maybeQuestionMark = urlSearchParams.toString().length ? "?" : "";
   *   window.history.replaceState(
   *     {},
   *     "",
   *     `${window.location.pathname}${maybeQuestionMark}${urlSearchParams.toString()}`,
   *   );
   * }
   * ```
   *
   * @param `urlSearchParams` The `urlSearchParams` to set
   * returned by `useSearchParamState` with the `replace` option as `true`.
   * @returns
   */
  replaceURLSearchParams?: (urlSearchParams: URLSearchParams) => void;

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
   * @param `valToStringify` The search param to stringify before setting it in the URL.
   * @returns The stringified search param.
   */
  stringify?: (valToStringify: TVal) => string;
}

type UseSearchParamStateOptions<TVal> = CommonOptions &
  ReadOptions<TVal> &
  WriteOptions<TVal> & {
    /**
     * A React hook to return the current URL. This hook is expected to re-render when the
     * URL changes.
     *
     * `useURLSearchParams` defaults to an internal hook.
     *
     * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
     * object for more info.
     */
    useURLSearchParams?: () => URLSearchParams;

    /**
     * If the search param state resolves to `null`, the URL is replaced with the search
     * param set as the `initialState` option.
     *
     * `enableSetInitialSearchParam` defaults to `true`
     */
    enableSetInitialSearchParam?: boolean;
  };

interface FunctionOptions {
  /**
   * A function to return the current URL object.
   *
   * `getURLSearchParams` defaults to the following function
   *
   * ```ts
   * const defaultGetURLSearchParams = () => new URLSearchParams(window.location.search);
   * ```
   *
   * See MDN's documentation on the [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
   * object for more info.
   */
  getURLSearchParams?: () => URLSearchParams;
}

type GetSearchParamOptions<TVal> = CommonOptions &
  ReadOptions<TVal> &
  FunctionOptions;

type SetSearchParamOptions<TVal> = CommonOptions &
  WriteOptions<TVal> &
  FunctionOptions & {
    /**
     * If `true`, when setting the search param, the updated URL will replace the top item
     * in the history stack instead of pushing to it.
     *
     * See MDN's documentation on [replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
     * for more info.
     */
    replace?: boolean;
  };

function useSearchParamState<TVal>(
  /**
   * The name of the URL search param to read from and write to.
   *
   * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)
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
  options: UseSearchParamStateOptions<TVal> = {},
) {
  const isFirstRender = React.useRef(true);

  const stringifyOption = options.stringify ?? defaultStringify;
  const parseOption = options.parse ?? defaultParse;
  const pushURLSearchParamsOption =
    options.pushURLSearchParams ?? defaultPushURLSearchParams;
  const replaceURLSearchParamsOption =
    options.replaceURLSearchParams ?? defaultReplaceURLSearchParams;
  const sanitizeOption = options.sanitize ?? defaultSanitize;
  const deleteEmptySearchParam = options.deleteEmptySearchParam ?? false;
  const enableSetInitialSearchParam =
    options.enableSetInitialSearchParam ?? true;
  const isEmptySearchParamOption =
    options.isEmptySearchParam ?? defaultIsEmptySearchParam;
  const validateOption = options.validate ?? defaultValidate;
  const onErrorOption = options.onError ?? defaultOnError;
  const { serverSideURLSearchParams: serverSideURLSearchParamsOption } =
    options;
  const useURLSearchParams =
    options.useURLSearchParams ?? buildUseURLSearchParams();
  const urlSearchParams = useURLSearchParams(
    serverSideURLSearchParamsOption?.toString() ?? "",
  );

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
  const pushURLSearchParams = useStableCallback(pushURLSearchParamsOption);
  const replaceURLSearchParams = useStableCallback(
    replaceURLSearchParamsOption,
  );
  const sanitize = useStableCallback(sanitizeOption);
  const isEmptySearchParam = useStableCallback(isEmptySearchParamOption);
  const validate = useStableCallback(validateOption);
  const onError = useStableCallback(onErrorOption);
  const getInitialState = useStableValue(initialState);
  const getServerSideURLSearchParamsOption = useStableValue(
    serverSideURLSearchParamsOption,
  );

  const searchParamVal = React.useMemo(
    () =>
      _getSearchParam<TVal>({
        urlSearchParams,
        sanitize,
        onError,
        searchParam,
        validate,
        parse,
        serverSideURLSearchParams: getServerSideURLSearchParamsOption(),
      }),
    [
      getServerSideURLSearchParamsOption,
      onError,
      parse,
      sanitize,
      searchParam,
      urlSearchParams,
      validate,
    ],
  );

  const defaultedSearchParamVal = searchParamVal ?? getInitialState();

  const setSearchParam = React.useCallback(
    (
      val: TVal | ((currVal: TVal) => TVal),
      { replace = false }: { replace: boolean } = {
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
        onError,
        searchParam,
        isEmptySearchParam,
        deleteEmptySearchParam,
        replaceURLSearchParams,
        pushURLSearchParams,
        replace,
        urlSearchParams,
      });
    },
    [
      defaultedSearchParamVal,
      deleteEmptySearchParam,
      isEmptySearchParam,
      onError,
      pushURLSearchParams,
      replaceURLSearchParams,
      searchParam,
      stringify,
      urlSearchParams,
    ],
  );

  React.useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

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
}

function _maybeGetURLSearchParams({
  serverSideURLSearchParams,
  urlSearchParams,
}: {
  serverSideURLSearchParams: ReadOptions<unknown>["serverSideURLSearchParams"];
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

function getSearchParam<TVal>(
  /**
   * The name of the URL search param to read from.
   *
   * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams) for more info.
   */
  searchParam: string,
  /**
   * Options passed by a particular instance of `getSearchParam`.
   */
  options: GetSearchParamOptions<TVal> = {},
) {
  const parse = options.parse ?? defaultParse;
  const sanitize = options.sanitize ?? defaultSanitize;
  const validate = options.validate ?? defaultValidate;
  const onError = options.onError ?? defaultOnError;
  const getURLSearchParams =
    options.getURLSearchParams ?? defaultGetURLSearchParams;
  const { serverSideURLSearchParams } = options;
  const urlSearchParams = getURLSearchParams();

  return _getSearchParam({
    serverSideURLSearchParams,
    urlSearchParams,
    sanitize,
    parse,
    validate,
    searchParam,
    onError,
  });
}

function setSearchParam<TVal>(
  /**
   * The name of the URL search param to read from.
   *
   * See MDN's documentation on [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams) for more info.
   */
  searchParam: string,
  /**
   * The value to set to the search param. The value is first passed to `stringify`, then updated in the URL.
   */
  searchParamValToSet: TVal,
  /**
   * Options passed by a particular instance of `setSearchParam`.
   */
  options: SetSearchParamOptions<TVal> = {},
) {
  const stringify = options.stringify ?? defaultStringify;
  const onError = options.onError ?? defaultOnError;
  const isEmptySearchParam =
    options.isEmptySearchParam ?? defaultIsEmptySearchParam;
  const deleteEmptySearchParam = options.deleteEmptySearchParam ?? false;
  const replaceURLSearchParams =
    options.replaceURLSearchParams ?? defaultReplaceURLSearchParams;
  const pushURLSearchParams =
    options.pushURLSearchParams ?? defaultPushURLSearchParams;
  const replace = options.replace ?? false;
  const getURLSearchParams = defaultGetURLSearchParams;
  const urlSearchParams = getURLSearchParams();

  _setSearchParam({
    searchParamValToSet,
    stringify,
    onError,
    searchParam,
    isEmptySearchParam,
    deleteEmptySearchParam,
    replaceURLSearchParams,
    pushURLSearchParams,
    replace,
    urlSearchParams,
  });
}

function _getSearchParam<TVal>({
  urlSearchParams,
  searchParam,
  serverSideURLSearchParams,
  sanitize,
  parse,
  validate,
  onError,
}: {
  searchParam: string;
  urlSearchParams: URLSearchParams;
  serverSideURLSearchParams: ReadOptions<TVal>["serverSideURLSearchParams"];
  sanitize: Required<ReadOptions<TVal>>["sanitize"];
  parse: Required<ReadOptions<TVal>>["parse"];
  validate: Required<ReadOptions<TVal>>["validate"];
  onError: Required<CommonOptions>["onError"];
}) {
  try {
    const maybeURLSearchParams = _maybeGetURLSearchParams({
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
    onError(error);
    return null;
  }
}

function _setSearchParam<TVal>({
  searchParam,
  searchParamValToSet,
  replace,
  urlSearchParams,
  pushURLSearchParams,
  replaceURLSearchParams,
  deleteEmptySearchParam,
  isEmptySearchParam,
  stringify,
  onError,
}: {
  searchParam: string;
  searchParamValToSet: TVal;
  replace: boolean;
  urlSearchParams: URLSearchParams;
  pushURLSearchParams: Required<WriteOptions<TVal>>["pushURLSearchParams"];
  replaceURLSearchParams: Required<
    WriteOptions<TVal>
  >["replaceURLSearchParams"];
  deleteEmptySearchParam: Required<
    WriteOptions<TVal>
  >["deleteEmptySearchParam"];
  isEmptySearchParam: Required<WriteOptions<TVal>>["isEmptySearchParam"];
  stringify: Required<WriteOptions<TVal>>["stringify"];
  onError: Required<CommonOptions>["onError"];
}) {
  const pushOrReplaceState = replace
    ? replaceURLSearchParams
    : pushURLSearchParams;

  try {
    if (urlSearchParams === null) {
      throw new Error(
        "Invalid URLSearchParams! This can occur if a search param is set on the server.",
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
    onError(error);
  }
}

export { useSearchParamState, getSearchParam, setSearchParam };
export type {
  UseSearchParamStateOptions,
  GetSearchParamOptions,
  SetSearchParamOptions,
};
