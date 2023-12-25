import React from "react";
import { defaultParse, defaultStringify, isWindowUndefined } from "./helpers";

function useEffectOnce(effect: React.EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(effect, []);
}

interface UseSearchParamStateOptions<T> {
  /**
   * @param `unsanitized` The raw string pulled from the URL search param.
   * @returns The sanitized string.
   */
  sanitize?: (unsanitized: string) => string;
  /**
   * @param `unparsed` The result of `sanitize` is passed as the `unparsed` argument to `parse`.
   * @returns A parsed value of the type `T` i.e. the type of `initialState`.
   */
  parse?: (unparsed: string) => T;
  /**
   * `validate` is expected to validate and return the `unvalidated` argument passed to it (presumably of type `T`), or throw an error. If an error is thrown, `onError` is called and `useSearchParamState` returns the initial state.
   *
   * @param `unvalidated` The result of `parse` is passed as the `unvalidated` argument to `validate`.
   * @returns The `unvalidated` argument, now validated as of type `T`.
   */
  validate?: (unvalidated: unknown) => T;
  /**
   * @param `valToStringify` The search param to stringify before setting it in the URL.
   * @returns The stringified search param.
   */
  stringify?: (valToStringify: T) => string;
  /**
   * A value of type `string` or `URL`.
   *
   * When passed, `serverSideURL` will be used when `window` is `undefined` to access the URL search param. This is useful for generating content on the server, i.e. with Next.js.
   */
  serverSideURL?: string | URL;
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
type UseSearchParamStateParams<T> = [
  searchParam: string,
  initialState: T,
  hookOptions?: UseSearchParamStateOptions<T>,
];

type UseSearchParamStateType = <T>(
  ...args: UseSearchParamStateParams<T>
) => readonly [T, (newVal: T | ((currVal: T) => T)) => void];

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

  return function useSearchParamState<T>(
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
    initialState: T,
    /**
     * Options passed by a particular instance of `useSearchParamState`.
     *
     * When an option is passed to both `useSearchParamState` and `SearchParamStateProvider`, only the option passed to `useSearchParamState` is respected. The exception is an `onError` option passed to both, in which case both `onError`s are called.
     */
    hookOptions: UseSearchParamStateOptions<T> = {}
  ) {
    const stringify =
      hookOptions.stringify ?? buildOptions.stringify ?? defaultStringify;
    const parse =
      hookOptions.parse ??
      (buildOptions.parse as (unparsed: string) => T) ??
      (defaultParse as (unparsed: string) => T);
    const rollbackOnError =
      hookOptions.rollbackOnError ?? buildOptions.rollbackOnError ?? false;
    const pushState =
      hookOptions.pushState ??
      buildOptions.pushState ??
      ((href: string) => {
        window.history.pushState({}, "", href);
      });
    const sanitize = hookOptions.sanitize ?? buildOptions.sanitize;
    const { validate, serverSideURL } = hookOptions;

    const [isFirstRender, setIsFirstRender] = React.useState(true);

    const setState = React.useCallback(
      (newState: T) => {
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
        if (serverSideURL instanceof URL) {
          return serverSideURL.toString();
        }
        if (typeof serverSideURL === "string") {
          return serverSideURL;
        }
        return null;
      }
      return window.location.href;
    }, [serverSideURL]);

    const safelySetUrlState = React.useCallback(
      (name: string, value: T) => {
        try {
          const href = maybeGetHref();
          if (href === null) {
            return { success: false };
          }

          const url = new URL(href);
          const urlParams = url.searchParams;
          const stringified = stringify(value);
          urlParams.set(name, stringified);
          pushState(url.href);
          return { success: true };
        } catch (e) {
          hookOptions.onError?.(e);
          buildOptions.onError?.(e);
          return { success: false };
        }
      },
      // avoid putting non-primitives passed by the consumer in the dep array
      [maybeGetHref]
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
          safelySetUrlState(searchParam, initialState);
          return initialState;
        }

        const sanitized =
          sanitize instanceof Function
            ? sanitize(initialParamState)
            : initialParamState;
        const parsed = parse(sanitized);
        const validated =
          validate instanceof Function ? validate(parsed) : parsed;

        return validated;
      } catch (e) {
        hookOptions.onError?.(e);
        buildOptions.onError?.(e);

        safelySetUrlState(searchParam, initialState);
        return initialState;
      }
      // avoid putting non-primitives passed by the consumer in the dep array
    }, [maybeGetHref, safelySetUrlState, searchParam]);

    React.useEffect(() => {
      const onEvent = () => {
        setState(getSearchParam());
      };

      window.addEventListener("popstate", onEvent);
      window.addEventListener("pushstate", onEvent);
      window.addEventListener("replacestate", onEvent);

      return () => {
        window.removeEventListener("popstate", onEvent);
        window.removeEventListener("pushstate", onEvent);
        window.removeEventListener("replacestate", onEvent);
      };
    }, [getSearchParam, setState]);

    const [serverState] = React.useState<T>(() => {
      return getSearchParam();
    });

    useEffectOnce(() => {
      setState(serverState);
      setIsFirstRender(false);
    });

    const currSearchParamState = isFirstRender
      ? serverState
      : (globalSearchParams[searchParam] as T);

    const wrappedSetState = React.useCallback(
      (newVal: T | ((currVal: T) => T)) => {
        if (newVal instanceof Function) {
          const { success } = safelySetUrlState(
            searchParam,
            newVal(currSearchParamState)
          );

          if (success || !rollbackOnError) {
            setState(newVal(currSearchParamState));
          }
          return;
        }

        const { success } = safelySetUrlState(searchParam, newVal);
        if (success || !rollbackOnError) {
          setState(newVal);
        }
      },
      [
        rollbackOnError,
        safelySetUrlState,
        searchParam,
        setState,
        currSearchParamState,
      ]
    );

    return [currSearchParamState, wrappedSetState] as const;
  };
}

function useSearchParamStateContext<T>(...args: UseSearchParamStateParams<T>) {
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
