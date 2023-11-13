import { useEffect, useState } from "react";
import { isWindowUndefined } from "./helpers";

// TODO
// 1. detect changes from the url directly. what to do in these cases? anything?
// 2. allow for dehydrate to act as a validator and throw
// 3. figure out versioning

export interface UseParamStateOptions<T> {
  dehydrate?: (val: T) => string;
  hydrate?: (val: string) => T;
  serverSideHref?: string;
  onError?: (e: unknown) => void;
  rollbackOnError?: boolean;
  pushState?: (href: string) => void;
  sanitize?: (unsanitized: string) => string;
}

type BuildUseParamStateOptions = Omit<
  UseParamStateOptions<unknown>,
  "dehydrate" | "hydrate" | "serverSideHref"
>;

export function buildUseParamState(
  buildOptions: BuildUseParamStateOptions = {}
) {
  return function useParamState<T>(
    searchParam: string,
    initialState: T,
    hookOptions: UseParamStateOptions<T> = {}
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

    const [state, setState] = useState<T>(() => {
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

    useEffect(() => {
      window.addEventListener("popstate", function () {
        // TODO: set state?
        console.log("Search params changed:", window.location.search);
      });

      window.addEventListener("hashchange", function () {
        // TODO: set state?
        console.log("Search params changed:", window.location.search);
        console.log("Hash or search params changed:", window.location.search);
      });
    }, []);

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
        setState((currVal) => {
          const { success } = safelySetUrlState(searchParam, newVal(currVal));

          if (!success && rollbackOnError) {
            return currVal;
          } else {
            return newVal(currVal);
          }
        });
        return;
      }

      const { success } = safelySetUrlState(searchParam, newVal);
      if (success || !rollbackOnError) {
        setState(newVal);
      }
    }

    return [state, wrappedSetState] as const;
  };
}

export const useSearchParamState = buildUseParamState();
