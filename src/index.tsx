import React from "react";
import { isWindowUndefined } from "./helpers";

// TODO
// 1. detect changes from the url directly. what to do in these cases? anything?
// 2. allow for dehydrate to act as a validator and throw

export interface UseSearchParamStateOptions<T> {
  dehydrate?: (val: T) => string;
  hydrate?: (val: string) => T;
  serverSideHref?: string;
  onError?: (e: unknown) => void;
  rollbackOnError?: boolean;
  pushState?: (href: string) => void;
  sanitize?: (unsanitized: string) => string;
}

type UseBuildSearchParamStateOptions = Omit<
  UseSearchParamStateOptions<unknown>,
  "dehydrate" | "hydrate" | "serverSideHref"
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
    searchParam: string,
    initialState: T,
    hookOptions: UseSearchParamStateOptions<T> = {}
  ) {
    const dehydrate =
      hookOptions.dehydrate ?? ((val: T) => JSON.stringify(val));
    const hydrate = hookOptions.hydrate ?? ((val: string) => JSON.parse(val));
    const onError = hookOptions.onError ?? buildOptions.onError;
    const rollbackOnError =
      hookOptions.rollbackOnError ?? buildOptions.rollbackOnError ?? false;
    const serverSideHref = hookOptions.serverSideHref;
    const pushState =
      hookOptions.pushState ??
      buildOptions.pushState ??
      ((href: string) => {
        window.history.pushState({}, "", href);
      });
    const sanitize = hookOptions.sanitize ?? buildOptions.sanitize;

    const [state, setState] = React.useState<T>(() => {
      try {
        const href = getHrefOrThrow();
        const url = new URL(href);
        const urlParams = url.searchParams;
        const initialParamState = urlParams.get(searchParam);
        if (initialParamState === null) {
          safelySetUrlState(searchParam, initialState);
          return initialState;
        }

        return hydrate(
          sanitize instanceof Function
            ? sanitize(initialParamState)
            : initialParamState
        );
      } catch (e) {
        onError?.(e);
        return initialState;
      }
    });

    React.useEffect(() => {
      setGlobalSearchParams((prev) => {
        return {
          ...prev,
          [searchParam]: state,
        };
      });
    }, [state, searchParam]);

    function getHrefOrThrow() {
      if (isWindowUndefined()) {
        if (serverSideHref === undefined) {
          throw new Error(
            "Window is undefined and no `serverSideHref` argument is provided"
          );
        }
        return serverSideHref;
      }
      return window.location.href;
    }

    function safelySetUrlState(name: string, value: T): { success: boolean } {
      try {
        const href = getHrefOrThrow();
        const url = new URL(href);
        const urlParams = url.searchParams;
        const dehydratedValue = dehydrate(value);
        urlParams.set(name, dehydratedValue);
        pushState(url.href);
        return { success: true };
      } catch (e) {
        onError?.(e);
        return { success: false };
      }
    }

    function wrappedSetState(newVal: T | ((currVal: T) => T)) {
      if (newVal instanceof Function) {
        const currVal = globalSearchParams[searchParam];
        const { success } = safelySetUrlState(searchParam, newVal(currVal));

        if (!success && rollbackOnError) {
          setState(currVal);
        } else {
          setState(newVal(currVal));
        }
        return;
      }

      const { success } = safelySetUrlState(searchParam, newVal);
      if (success || !rollbackOnError) {
        setState(newVal);
      }
    }

    return [globalSearchParams[searchParam] as T, wrappedSetState] as const;
  };
}

function useSearchParamStateContext<T>(...args: UseSearchParamStateParams<T>) {
  const context = React.useContext(SearchParamStateContext);
  if (context === undefined) {
    throw new Error(
      "useSearchParamStateContext must be used within a SearchParamStateProvider"
    );
  }
  return context(...args);
}

export {
  SearchParamStateContext,
  useSearchParamStateContext as useSearchParamState,
  SearchParamStateProvider,
};
