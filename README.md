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
import { useLocation } from "react-router";

function Demo() {
  const [counterState, setCounterState] = useSearchParamState("counter", 0);
}
```

or

```tsx
import { buildUseSearchParamState } from "use-search-param-state";
import { z } from "zod";

export const useSearchParamState = buildUseSearchParamState({
  sanitize: yourSanitizer,
});

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

If the `window` object is `undefined` (i.e we're on the server), `useSearchParamState` will use the `serverSideURL` option. If `serverSideURL` is also not provided, `counterState` will be returned initial state (i.e. `0`).

If the `counter` search param does not exist (i.e. `URLSearchParams.get` returns `null`), `counterState` will be returned as the initial state, and the `counter` search param will be set to the initial state using the `stringify` option. If `enableSetInitialSearchParam` is set to `false`, the `counter` search param will not be set.

Once the `counter` search param is accessed, the raw string is passed to `sanitize`, the output of `sanitize` is passed to `parse`, and finally the output of `parse` is passed to `validate`. Note that `useSearchParamState` aims to return a _parsed_ value, not a _stringified_ value!

If `sanitize`, `parse`, or `validate` throw an error, the `onError` option is called and `counterState` will be returned as the initial state.

If none of `sanitize`, `parse`, and `validate` throw an error, `counterState` is returned as the sanitized, parsed, and validated value in the `counter` search param.

---

When setting the `counter` search param using `setCounterState`, the new state is stringified with the `stringify` option, and the URL is set using the `pushState` option. If `setCounterState` is called with the `replace` option, the `replaceState` option is used instead of the `pushState` option.

If `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

If `stringify` or `pushState`/`replaceState` throw an error, `onError` will be called and the URL will not be set.

## `useSearchParamState` vs `getSearchParam`/`setSearchParam`

`use-search-param-state` exports three main utilities: `useSearchParamState`, `getSearchParam`, and `setSearchParam`.

The primary difference between `useSearchParamState` and `getSearchParam`/`setSearchParam` is that `useSearchParamState` is a hook, while `getSearchParam`/`setSearchParam` are functions. Because of this difference, `useSearchParamState` is able to react to URL changes and always return the up-to-date search param value, while `getSearchParam` provides a snapshot of the search param value at the time when it was called. Similarly, `getSearchParam` will not force `getSearchParam` to re-evaluate.

In React components, prefer to use `useSearchParamState`. When the search param needs to be read or set outside React, `getSearchParam`/`setSearchParam` are hook-less alternatives with the same API.

## Exports

```ts
import {
  buildUseSearchParamState,
  BuildUseSearchParamStateOptions,
  useSearchParamState,
  UseSearchParamStateOptions,
  buildGetSearchParam,
  BuildGetSearchParamOptions,
  getSearchParam,
  GetSearchParamOptions,
  buildSetSearchParam,
  BuildSetSearchParamOptions,
  setSearchParam,
  SetSearchParamOptions,
} from "use-search-param-state";
import { useURL } from "use-search-param-state/use-url";
```

## All options

````ts
interface AllOptions<TVal> {
  /**
   * `sanitize` defaults to the following function:
   *
   * ```ts
   * const defaultSanitize = (unsanitized: string) => unsanitized;
   * ```
   *
   * `sanitize` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If
   * `sanitize` is passed to both, only the option passed to `useSearchParamState` is respected.
   * The same applies to `getSearchParam` and `buildGetSearchParam`.
   *
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the default state.
   * If using `getSearchParam`, `null` is returned.
   *
   * @param `unsanitized` The raw string pulled from the searchParams search param.
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
   * `parse` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If `parse`
   * is passed to both, only the option passed to `useSearchParamState` is respected. The same
   * applies to `getSearchParam` and `buildGetSearchParam`.
   *
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the default state.
   * If using `getSearchParam`, `null` is returned.
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
   * If an error is thrown, `onError` is called and `useSearchParamState` returns the default state.
   * If using `getSearchParam`, `null` is returned.
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
   * `stringify` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If
   * `stringify` is passed to both, only the option passed to `useSearchParamState` is respected.
   * The same applies to `setSearchParam` and `buildSetSearchParam`
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
   * `buildUseSearchParamState`. If `deleteEmptySearchParam` is passed to both, only the option
   * passed to `useSearchParamState` is respected.
   *
   * The same applies to `setSearchParam` and `buildSetSearchParam`.
   */
  deleteEmptySearchParam?: boolean;

  /**
   * When setting the search param, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam`
   * returns `true`, the search param will be deleted from the URL.
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
   * `isEmptySearchParam` can be passed to both `useSearchParamState` and `buildUseSearchParamState`.
   * If `isEmptySearchParam` is passed to both, only the option passed to `useSearchParamState` is
   * respected. The same applies to `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `searchParamVal` When setting the state, the new state is passed as `searchParamVal`.
   * @returns A boolean.
   */
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;

  /**
   * `pushState` defaults to the following function:
   *
   * ```ts
   * export function defaultPushState(url: URL) {
   *   window.history.pushState({}, "", url);
   * }
   * ```
   *
   * `pushState` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If
   * `pushState` is passed to both, only the option passed to `useSearchParamState` is respected.
   * The same applies to `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `url` The `url` to set as the URL when calling the `setState` function returned by
   * `useSearchParamState`.
   * @returns
   */
  pushState?: (url: URL) => void;

  /**
   * `replaceState` defaults to the following function:
   *
   * ```ts
   * export function defaultReplaceState(url: URL) {
   *   window.history.replaceState({}, "", url);
   * }
   * ```
   *
   * `replaceState` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If
   * `replaceState` is passed to both, only the option passed to `useSearchParamState` is respected.
   * The same applies to `setSearchParam` and `buildSetSearchParam`.
   *
   * @param `url` The `url` to set as the URL when calling the `setState` function returned by
   * `useSearchParamState` with the `replace` option as `true`.
   * @returns
   */
  replaceState?: (url: URL) => void;

  /**
   * If the search param state resolves to `null`, the URL is replaced with the search param set as
   * the `initialState` option.
   *
   * `enableSetInitialSearchParam` defaults to `true`
   *
   * `enableSetInitialSearchParam` can be passed to both `useSearchParamState` and
   * `buildUseSearchParamState`. If `enableSetInitialSearchParam` is passed to both, only the
   * option passed to `useSearchParamState` is respected.
   */
  enableSetInitialSearchParam?: boolean;

  /**
   * `onError` defaults to the following function:
   *
   * ```ts
   * export function defaultOnError(_e: unknown) {
   *   return;
   * }
   * ```
   *
   * `onError` can be passed to both `useSearchParamState` and `buildUseSearchParamState`. If
   * `onError` is passed to both, both `onError` functions are called. The same applies to
   * `getSearchParam`,`buildGetSearchParam`, `setSearchParam`, and `buildSetSearchParam`.
   *
   * @param `error` The error caught in one of `try` `catch` blocks.
   * @returns
   */
  onError?: (error: unknown) => void;

  /**
   * When passed, `serverSideURL` will be used when `window` is `undefined` to access the URL
   * search param. This is useful for generating content on the server, i.e. with Next.js or Remix.
   *
   * `serverSideURL` has no default.
   *
   * `validate` can only be passed to `useSearchParamState`/`getSearchParam`, not
   * `buildUseSearchParamState`/`buildGetSearchParam`.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object for more info.
   */
  serverSideURL?: URL;

  /**
   * If `true`, when setting the search param, the updated URL will replace the top item in the
   * history stack instead of pushing to it.
   *
   * See MDN's documentation on [replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState) for more info.
   *
   */
  replace?: boolean;

  /**
   * A React hook to return the current URL. This hook is expected to re-render when the URL
   * changes.
   *
   * The hook to pass will depend on your routing library. A basic `useURL` hook is exported by
   * `use-search-param-state/use-url` for your convenience.
   *
   * `useURL` defaults to the `useURL` hook exported at `'use-search-param-state/use-url'`
   *
   * `useURL` can only be passed to `buildUseSearchParamState`, not `useSearchParamState`.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object for more info.
   */
  useURL?: () => URL;

  /**
   * A function to return the current URL object.
   *
   * `getURL` is required and has no default.
   *
   * `getURL` can only be passed to `buildGetSearchParam`, not `getSearchParam`.
   *
   * See MDN's documentation on the [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object for more info.
   */
  getURL?: () => URL;
}
````

## `buildUseSearchParamState` options

```ts
interface BuildUseSearchParamState<TVal> {
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (url: URL) => void;
  replaceState?: (url: URL) => void;
  enableSetInitialSearchParam?: boolean;
  onError?: (error: unknown) => void;
  serverSideURL?: URL;
  useURL?: () => URL;
}
```

## `useSearchParamState` options

```ts
interface UseSearchParamStateOptions<TVal> {
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (url: URL) => void;
  replaceState?: (url: URL) => void;
  enableSetInitialSearchParam?: boolean;
  onError?: (error: unknown) => void;
  serverSideURL?: URL;
}
```

## `buildGetSearchParam` options

```ts
interface BuildGetSearchParamOptions<TVal> {
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;
  onError?: (error: unknown) => void;
  serverSideURL?: URL;
  getURL: () => URL;
}
```

## `getSearchParam` options

```ts
interface GetSearchParamOptions<TVal> {
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;
  onError?: (error: unknown) => void;
  serverSideURL?: URL;
}
```

## `buildSetSearchParam` options

```ts
interface BuildSetSearchParamOptions<TVal> {
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (url: URL) => void;
  replaceState?: (url: URL) => void;
  onError?: (error: unknown) => void;
  getURL?: () => URL;
  replace?: boolean;
}
```

## `setSearchParam` options

```ts
interface SetSearchParamOptions<TVal> {
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushState?: (url: URL) => void;
  replaceState?: (url: URL) => void;
  onError?: (error: unknown) => void;
  replace?: boolean;
}
```
