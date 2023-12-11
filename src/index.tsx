import React from "react";
import { defaultParse, isWindowUndefined } from "./helpers";

function useEffectOnce(effect: React.EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(effect, []);
}

interface UseSearchParamStateOptions<T> {
  stringify?: (val: T) => string;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => T;
  validate?: (unvalidated: unknown) => T;
  serverSideURL?: string | URL;
  rollbackOnError?: boolean;
  pushState?: (href: string) => void;
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

  // TODO: is it an issue that this has a different mem address on every render
  return function useSearchParamState<T>(
    searchParam: string,
    initialState: T,
    hookOptions: UseSearchParamStateOptions<T> = {}
  ) {
    const stringify =
      hookOptions.stringify ??
      buildOptions.stringify ??
      ((val: T) => JSON.stringify(val));
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
        return initialState;
      }
    }, [maybeGetHref, safelySetUrlState, searchParam]);

    React.useEffect(() => {
      const reactToPopState = () => {
        setState(getSearchParam());
      };

      window.addEventListener("popstate", reactToPopState);

      return () => {
        window.removeEventListener("popstate", reactToPopState);
      };
    }, [getSearchParam, setState]);

    const [serverState] = React.useState<T>(() => {
      return getSearchParam();
    });

    useEffectOnce(() => {
      setState(serverState);
      setIsFirstRender(false);
    });

    const wrappedSetState = React.useCallback(
      (newVal: T | ((currVal: T) => T)) => {
        if (newVal instanceof Function) {
          const currVal = globalSearchParams[searchParam];
          const { success } = safelySetUrlState(searchParam, newVal(currVal));

          if (success || !rollbackOnError) {
            setState(newVal(currVal));
          }
          return;
        }

        const { success } = safelySetUrlState(searchParam, newVal);
        if (success || !rollbackOnError) {
          setState(newVal);
        }
      },
      [rollbackOnError, safelySetUrlState, searchParam, setState]
    );

    const stateToReturn = isFirstRender
      ? serverState
      : (globalSearchParams[searchParam] as T);
    return [stateToReturn, wrappedSetState] as const;
  };
}

function useSearchParamStateContext<T>(...args: UseSearchParamStateParams<T>) {
  const context = React.useContext(SearchParamStateContext);
  if (context === undefined) {
    throw new Error(
      "`useSearchParamStateContext` must be used within a `SearchParamStateProvider`"
    );
  }
  return context(...args);
}

export {
  SearchParamStateProvider,
  useSearchParamStateContext as useSearchParamState,
};
export type { UseSearchParamStateOptions };
