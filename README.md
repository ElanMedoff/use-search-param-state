# use-search-param-state

A hook to synchronize React state with URL search params.

[![version](https://img.shields.io/npm/v/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![bundle size](https://img.shields.io/bundlephobia/minzip/use-search-param-state)](https://bundlephobia.com/package/use-search-param-state)
[![downloads per week](https://img.shields.io/npm/dw/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![package quality](https://packagequality.com/shield/use-search-param-state.svg)](https://packagequality.com/#?package=use-search-param-state)
[![license](https://img.shields.io/npm/l/use-search-param-state)](https://github.com/ElanMedoff/use-search-param-state/blob/master/LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies%20-%200%20-%20green)](https://github.com/ElanMedoff/use-search-param-state/blob/master/package.json)

<!-- a hack to get around github sanitizing styles from markdown  -->
<br>
<p align="center">
    <img src="https://elanmed.dev/npm-packages/use-search-param-state-logo.png" width="500px" />
</p>

> Docs for version 2.0.13 (the last version before version 3.0.0) can be viewed [here](https://github.com/ElanMedoff/use-search-param-state/tree/7da00161c2caa624456363adc2558b8784369028)

## Basic usage

```tsx
import { useSearchParamState } from "use-search-param-state";

function Demo() {
  const [counterState, setCounterState] = useSearchParamState("counter", 0);
}
```

or

```tsx
import {
  useSearchParamState as _useSearchParamState,
  UseSearchParamStateOptions,
} from "use-search-param-state";
import { z } from "zod";

export function useSearchParamState<TVal>(
  searchParam: string,
  initialState: TVal,
  options: UseSearchParamStateOptions<TVal>,
) {
  return useSearchParamState(searchParam, initialState, {
    sanitize: yourSanitizer,
    ...options,
  });
}

function Demo() {
  const schema = z.number();
  const [counterState, setCounterState] = useSearchParamState("counter", 0, {
    validate: z.number().parse,
    deleteEmptySearchParam: true,
  });
}
```

## Explanation

On the first render, `useSearchParamState` will read from the `counter` URL search param. The `counter` search param is read using the return value of the `useURL` hook.

If the `window` object is `undefined` (i.e on the server), `useSearchParamState` will use the `serverSideURL` option. If `serverSideURL` is also not provided, `counterState` will be returned initial state (i.e. `0`).

If the `counter` search param does not exist (i.e. `URLSearchParams.get` returns `null`), `counterState` will be returned as the initial state, and the `counter` search param will be set to the initial state using the `stringify` option. If `enableSetInitialSearchParam` is set to `false`, the `counter` search param will not be set.

Once the `counter` search param is accessed, the raw string is passed to `sanitize`, the output of `sanitize` is passed to `parse`, and finally the output of `parse` is passed to `validate`. Note that `useSearchParamState` aims to return a _parsed_ value, not a _stringified_ value!

If `sanitize`, `parse`, or `validate` throw an error, the `onError` option is called and `counterState` will be returned as the initial state.

If none of `sanitize`, `parse`, and `validate` throw an error, `counterState` is returned as the sanitized, parsed, and validated value in the `counter` search param.

---

When setting the `counter` search param using `setCounterState`, the new state is stringified with the `stringify` option, and the URL is set using the `pushState` option. If `setCounterState` is called with the `replace` option, the `replaceState` option is used instead of the `pushState` option.

If `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

If `stringify` or `pushState`/`replaceState` throw an error, `onError` will be called and the URL will not be set.

## Exports

```ts
import {
  useSearchParamState,
  getSearchParam,
  setSearchParam,
  UseSearchParamStateOptions,
  GetSearchParamOptions,
  SetSearchParamOptions,
} from "use-search-param-state";
import { useURL } from "use-search-param-state/use-url-search-params";
```

## `useSearchParamState` vs `getSearchParam`/`setSearchParam`

`use-search-param-state` exports three main utilities: `useSearchParamState`, `getSearchParam`, and `setSearchParam`.

The primary difference between `useSearchParamState` and `getSearchParam`/`setSearchParam` is that `useSearchParamState` is a hook, while `getSearchParam`/`setSearchParam` are functions. Because of this difference, `useSearchParamState` is able to react to URL changes and always return the up-to-date search param value, while `getSearchParam` provides a snapshot of the search param value at the time when it was called. Similarly, `getSearchParam` will not force `getSearchParam` to re-evaluate.

In React components, prefer to use `useSearchParamState`. When the search param needs to be read or set outside React, `getSearchParam`/`setSearchParam` are hook-less alternatives with the same API.

## All options

```ts

```

## `useSearchParamState` options

```ts
interface UseSearchParamStateOptions<TVal> {
  onError?: (error: unknown) => void;
  // read options
  serverSideURL?: URLSearchParams;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;
  // write options
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (urlSearchParams: URLSearchParams) => void;
  replaceState?: (urlSearchParams: URLSearchParams) => void;
  // hook-only options
  enableSetInitialSearchParam?: boolean;
  useURL?: () => URLSearchParams;
}
```

## `getSearchParam` options

```ts
interface GetSearchParamOptions<TVal> {
  onError?: (error: unknown) => void;
  // read options
  serverSideURL?: URLSearchParams;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;
  // function-only options
  getURL?: () => URLSearchParams;
}
```

## `setSearchParam` options

```ts
interface SetSearchParamOptions<TVal> {
  onError?: (error: unknown) => void;
  // write options
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (urlSearchParams: URLSearchParams) => void;
  replaceState?: (urlSearchParams: URLSearchParams) => void;
  replace?: boolean;
  // function-only options
  getURL?: () => URLSearchParams;
}
```

## Recipes

### React Router
