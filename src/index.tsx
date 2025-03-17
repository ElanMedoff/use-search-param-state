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
} from "./helpers";

interface Options<TVal> {
  /**
   * @param `unsanitized` The raw string pulled from the searchParams search param.
   * @returns The sanitized string.
   */
  sanitize?: (unsanitized: string) => string;

  /**
   * @param `unparsed` The result of `sanitize` is passed as `unparsed`.
   * @returns A parsed value of the type `TVal` i.e. the type of `initialState`.
   */
  parse?: (unparsed: string) => TVal;

  /**
   * `validate` is expected to validate and return the `unvalidated` argument passed to it (presumably of type `TVal`), or throw an error. If an error is thrown, `onError` is called and `useSearchParamState` returns the default state.
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
   * @param `url` The `url` to set as the URL when calling the `setState` function returned by `useSearchParamState`.
   * @returns
   */
  pushState?: (url: URL) => void;

  /**
   * @param `error` The error caught in one of `useSearchParamState`'s `try` `catch` blocks.
   * @returns
   */
  onError?: (error: unknown) => void;

  /**
   * A React hook to return the current URL. This hook is expected to re-render when the URL changes. The hook to pass will depend on your routing library.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) objecet for more info.
   */
  useURL: (...args: unknown[]) => URL;

  /**
   * The current URL object.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object for more info.
   */
  url: URL;

  /**
   * When passed, `serverSideURL` will be used when `window` is `undefined` to access the URL search param. This is useful for generating content on the server, i.e. with Next.js or Remix.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object for more info.
   */
  serverSideURL?: URL;
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
  serverSideURL?: Options<TVal>["serverSideURL"];
};

interface WriteOptions<TVal> {
  deleteEmptySearchParam?: Options<TVal>["deleteEmptySearchParam"];
  isEmptySearchParam?: Options<TVal>["isEmptySearchParam"];
  pushState?: Options<TVal>["pushState"];
  stringify?: Options<TVal>["stringify"];
}

type BuildUseSearchParamStateOptions<TVal> = CommonOptions<TVal> &
  ReadBuildOptions<TVal> &
  WriteOptions<TVal> & {
    useURL: Options<TVal>["useURL"];
  };

type UseSearchParamStateOptions<TVal> = CommonOptions<TVal> &
  ReadLocalOptions<TVal> &
  WriteOptions<TVal>;
type BuildGetSearchParamOptions<TVal> = CommonOptions<TVal> &
  ReadBuildOptions<TVal>;
type GetSearchParamOptions<TVal> = CommonOptions<TVal> &
  ReadLocalOptions<TVal> & {
    url: Options<TVal>["url"];
  };

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
     * The default state returned by `useSearchParamState` if no valid URL search param is present to read from.
     *
     * Note that if `sanitize`, `parse`, or `validate` throw an error, the default state will also be returned.
     */
    initialState: TVal,

    /**
     * Options passed by a particular instance of `useSearchParamState`.
     *
     * When an option is passed to both `useSearchParamState` and `buildUseSearchParamState`, only the option passed to `useSearchParamState` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    hookOptions: UseSearchParamStateOptions<TVal> = {},
  ) {
    const { useURL } = buildOptions;
    const url = useURL();

    const stringifyOption =
      hookOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const parseOption =
      hookOptions.parse ??
      (buildOptions.parse as Options<TVal>["parse"]) ??
      defaultParse;
    const pushStateOption =
      hookOptions.pushState ?? buildOptions.pushState ?? defaultPushState;
    const sanitizeOption =
      hookOptions.sanitize ?? buildOptions.sanitize ?? defaultSanitize;
    const deleteEmptySearchParam =
      hookOptions.deleteEmptySearchParam ??
      buildOptions.deleteEmptySearchParam ??
      false;
    const isEmptySearchParamOption =
      hookOptions.isEmptySearchParam ??
      buildOptions.isEmptySearchParam ??
      defaultIsEmptySearchParam;
    const validateOption = hookOptions.validate ?? defaultValidate;
    const buildOnErrorOption = buildOptions.onError ?? defaultOnError;
    const hookOnErrorOption = hookOptions.onError ?? defaultOnError;
    const { serverSideURL } = hookOptions;

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
    const sanitize = useStableCallback(sanitizeOption);
    const isEmptySearchParam = useStableCallback(isEmptySearchParamOption);
    const validate = useStableCallback(validateOption);
    const buildOnError = useStableCallback(buildOnErrorOption);
    const hookOnError = useStableCallback(hookOnErrorOption);
    const getInitialState = useStableValue(initialState);

    const searchParamVal =
      React.useMemo(
        () =>
          _getSearchParamVal<TVal>({
            url,
            sanitize,
            localOnError: hookOnError,
            buildOnError,
            searchParam,
            validate,
            parse,
            serverSideURL,
          }),
        [
          buildOnError,
          hookOnError,
          parse,
          sanitize,
          searchParam,
          serverSideURL,
          url,
          validate,
        ],
      ) ?? getInitialState();

    const setSearchParam = React.useCallback(
      (val: TVal | ((currVal: TVal) => TVal)) => {
        let valToSet: TVal;
        if (val instanceof Function) {
          valToSet = val(searchParamVal as TVal);
        } else {
          valToSet = val;
        }

        try {
          const maybeURL = maybeGetURL({
            serverSideURL,
            url,
          });

          if (maybeURL === null) {
            throw new Error(
              "Invalid URL! This can occur if `useSearchParamState` is running on the server and the `serverSideURL` option isn't passed.",
            );
          }

          if (deleteEmptySearchParam && isEmptySearchParam(valToSet)) {
            url.searchParams.delete(searchParam);
            pushState(url);
            return;
          }

          const stringified = stringify(valToSet);
          url.searchParams.set(searchParam, stringified);
          pushState(url);
        } catch (error) {
          hookOnError(error);
          buildOnError(error);
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
        serverSideURL,
        stringify,
        url,
      ],
    );

    return [searchParamVal, setSearchParam] as const;
  };
}

function maybeGetURL({
  serverSideURL,
  url,
}: {
  serverSideURL: Options<unknown>["serverSideURL"];
  url: Options<unknown>["url"];
}) {
  if (isWindowUndefined()) {
    if (serverSideURL instanceof URL) {
      return serverSideURL;
    }
    return null;
  }
  return url;
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
      url: new URL(window.location.href),
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
    const buildOnError = buildOptions.onError ?? defaultOnError;
    const localOnError = localOptions.onError ?? defaultOnError;
    const { serverSideURL, url } = localOptions;

    return _getSearchParamVal({
      serverSideURL,
      url,
      sanitize,
      parse,
      validate,
      searchParam,
      buildOnError,
      localOnError,
    });
  };
}

function _getSearchParamVal<TVal>({
  url,
  searchParam,
  serverSideURL,
  sanitize,
  parse,
  validate,
  buildOnError,
  localOnError,
}: {
  searchParam: string;
  url: Options<TVal>["url"];
  serverSideURL: Options<TVal>["serverSideURL"];
  sanitize: Required<Options<TVal>>["sanitize"];
  parse: Required<Options<TVal>>["parse"];
  validate: Required<Options<TVal>>["validate"];
  buildOnError: Required<Options<TVal>>["onError"];
  localOnError: Required<Options<TVal>>["onError"];
}) {
  try {
    const maybeURL = maybeGetURL({ serverSideURL, url });

    if (maybeURL === null) {
      return null;
    }

    const rawSearchParamVal = maybeURL.searchParams.get(searchParam);
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

const getSearchParam = buildGetSearchParam();

export { buildUseSearchParamState, buildGetSearchParam, getSearchParam };
export type {
  UseSearchParamStateOptions,
  BuildUseSearchParamStateOptions,
  GetSearchParamOptions,
  BuildGetSearchParamOptions,
};
