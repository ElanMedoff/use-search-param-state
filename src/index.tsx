import React from "react";
import {
  defaultParse,
  defaultStringify,
  defaultIsEmptySearchParam,
  isWindowUndefined,
} from "./helpers";

function useEffectOnce(effect: React.EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(effect, []);
}

interface UseSearchParamStateOptions<TVal> {
  /**
   * @param `unsanitized` The raw string pulled from the URL search param.
   * @returns The sanitized string.
   */
  sanitize?: (unsanitized: string) => string;
  /**
   * @param `unparsed` The result of `sanitize` is passed as `unparsed`.
   * @returns A parsed value of the type `TVal` i.e. the type of `initialState`.
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
   * On first render, or when calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is set to `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   */
  deleteEmptySearchParam?: boolean;
  /**
   * On first render, or when calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.
   *
   * @param `searchParamVal` On the first render, the result of `validate` is passed as `searchParamVal`. When setting the state, the new state is passed as `searchParamVal`.
   * @returns A boolean.
   */
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  /**
   * A value of type `string` - any valid string input to the `URL` constructor.
   *
   * When passed, `serverSideURL` will be used when `window` is `undefined` to access the URL search param. This is useful for generating content on the server, i.e. with Next.js.
   */
  serverSideURL?: string;
  /**
   * A `boolean`.
   *
   * When calling the `setState` function returned by `useSearchParamState`, `pushState` will be called to set the URL search param with the latest React state value. If setting the search param in the URL throws an error, and `rollbackOnError` is set to `true`, the local React state will "rollback" to its previous value.
   */
  rollbackOnError?: boolean;
  /**
   * @param `href` The `href` to set as the URL when calling the `setState` function returned by `useSearchParamState`.
   * @returns
   */
  pushState?: (href: string) => void;
  /**
   * @param `e` The error caught in one of `useSearchParamState`'s `try` `catch` blocks.
   * @returns
   */
  onError?: (e: unknown) => void;
}

export type UseBuildSearchParamStateOptions = Omit<
  UseSearchParamStateOptions<unknown>,
  "validate" | "serverSideURL"
>;
type UseSearchParamStateParams<TVal> = [
  searchParam: string,
  initialState: TVal,
  hookOptions?: UseSearchParamStateOptions<TVal>,
];

type UseSearchParamStateType = <TVal>(
  ...args: UseSearchParamStateParams<TVal>
) => readonly [TVal, (newVal: TVal | ((currVal: TVal) => TVal)) => void];

const SearchParamStateContext = React.createContext<
  UseSearchParamStateType | undefined
>(undefined);

function SearchParamStateProvider({
  children,
  options: buildOptions = {},
}: {
  children: React.ReactNode;
  options?: UseBuildSearchParamStateOptions;
}) {
  const useSearchParamState = useBuildSearchParamState(buildOptions);

  return (
    <SearchParamStateContext.Provider value={useSearchParamState}>
      {children}
    </SearchParamStateContext.Provider>
  );
}

function useBuildSearchParamState(
  buildOptions: UseBuildSearchParamStateOptions = {}
) {
  const [globalSearchParams, setGlobalSearchParams] = React.useState<
    Record<string, any>
  >({});

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
    initialState: TVal,
    /**
     * Options passed by a particular instance of `useSearchParamState`.
     *
     * When an option is passed to both `useSearchParamState` and `SearchParamStateProvider`, only the option passed to `useSearchParamState` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    hookOptions: UseSearchParamStateOptions<TVal> = {}
  ) {
    const stringify =
      hookOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const parse =
      hookOptions.parse ??
      (buildOptions.parse as (unparsed: string) => TVal) ??
      (defaultParse as (unparsed: string) => TVal);
    const rollbackOnError =
      hookOptions.rollbackOnError ?? buildOptions.rollbackOnError ?? false;
    const pushState =
      hookOptions.pushState ??
      buildOptions.pushState ??
      ((href: string) => {
        window.history.pushState({}, "", href);
      });
    const sanitize = hookOptions.sanitize ?? buildOptions.sanitize;
    const deleteEmptySearchParam =
      hookOptions.deleteEmptySearchParam ??
      buildOptions.deleteEmptySearchParam ??
      false;

    const isEmptySearchParam =
      hookOptions.isEmptySearchParam ??
      buildOptions.isEmptySearchParam ??
      defaultIsEmptySearchParam;

    const { validate, serverSideURL } = hookOptions;

    const [isFirstRender, setIsFirstRender] = React.useState(true);

    const setState = React.useCallback(
      (newState: TVal) => {
        setGlobalSearchParams((prev) => {
          return {
            ...prev,
            [searchParam]: newState,
          };
        });
      },
      [searchParam]
    );

    const maybeGetHref = React.useCallback(() => {
      if (isWindowUndefined()) {
        if (typeof serverSideURL === "string") {
          return serverSideURL;
        }
        return null;
      }
      return window.location.href;
    }, [serverSideURL]);

    const safelySetUrlState = React.useCallback(
      (value: TVal) => {
        try {
          const href = maybeGetHref();
          if (href === null) {
            return { success: false };
          }
          const url = new URL(href);
          if (deleteEmptySearchParam && isEmptySearchParam(value)) {
            url.searchParams.delete(searchParam);
            pushState(url.href);
            return { success: true };
          }

          const stringified = stringify(value);
          url.searchParams.set(searchParam, stringified);
          pushState(url.href);
          return { success: true };
        } catch (e) {
          hookOptions.onError?.(e);
          buildOptions.onError?.(e);
          return { success: false };
        }
      },
      // avoid putting non-primitives passed by the consumer in the dep array
      [maybeGetHref, deleteEmptySearchParam, searchParam]
    );

    const getSearchParam = React.useCallback(() => {
      try {
        const href = maybeGetHref();
        if (href === null) {
          return initialState;
        }

        const url = new URL(href);
        const urlParams = url.searchParams;
        const initialParamState = urlParams.get(searchParam);
        if (initialParamState === null) {
          safelySetUrlState(initialState);
          return initialState;
        }

        const sanitized =
          sanitize instanceof Function
            ? sanitize(initialParamState)
            : initialParamState;
        const parsed = parse(sanitized);
        const validated =
          validate instanceof Function ? validate(parsed) : parsed;

        if (deleteEmptySearchParam && isEmptySearchParam(validated)) {
          safelySetUrlState(validated);
        }

        return validated;
      } catch (e) {
        hookOptions.onError?.(e);
        buildOptions.onError?.(e);

        safelySetUrlState(initialState);
        return initialState;
      }
      // avoid putting non-primitives passed by the consumer in the dep array
    }, [maybeGetHref, safelySetUrlState, searchParam, deleteEmptySearchParam]);

    React.useEffect(() => {
      const onEvent = () => {
        setState(getSearchParam());
      };
      window.addEventListener("popstate", onEvent);
      return () => {
        window.removeEventListener("popstate", onEvent);
      };
    }, [getSearchParam, setState]);

    const [serverState] = React.useState<TVal>(() => {
      return getSearchParam();
    });

    useEffectOnce(() => {
      setState(serverState);
      setIsFirstRender(false);
    });

    const currSearchParamState = isFirstRender
      ? serverState
      : (globalSearchParams[searchParam] as TVal);

    const wrappedSetState = React.useCallback(
      (newVal: TVal | ((currVal: TVal) => TVal)) => {
        if (newVal instanceof Function) {
          const { success } = safelySetUrlState(newVal(currSearchParamState));

          if (success || !rollbackOnError) {
            setState(newVal(currSearchParamState));
          }
          return;
        }

        const { success } = safelySetUrlState(newVal);
        if (success || !rollbackOnError) {
          setState(newVal);
        }
      },
      [rollbackOnError, safelySetUrlState, setState, currSearchParamState]
    );

    return [currSearchParamState, wrappedSetState] as const;
  };
}

function useSearchParamStateContext<TVal>(
  ...args: UseSearchParamStateParams<TVal>
) {
  const context = React.useContext(SearchParamStateContext);
  if (context === undefined) {
    throw new Error(
      "useSearchParamState can only be called by a component that is a child of SearchParamStateProvider."
    );
  }
  return context(...args);
}

export {
  SearchParamStateProvider,
  useSearchParamStateContext as useSearchParamState,
};
export type { UseSearchParamStateOptions };
