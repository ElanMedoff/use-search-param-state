# use-search-param-state

A hook to synchronize React state with URL search params.

[![version](https://img.shields.io/npm/v/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![bundle size](https://img.shields.io/bundlephobia/minzip/use-search-param-state)](https://bundlephobia.com/package/use-search-param-state)
[![downloads per week](https://img.shields.io/npm/dw/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![package quality](https://packagequality.com/shield/use-search-param-state.svg)](https://packagequality.com/#?package=use-search-param-state)
[![license](https://img.shields.io/npm/l/use-search-param-state)](https://github.com/ElanMedoff/use-search-param-state/blob/master/LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies%20-%201%20-%20green)](https://github.com/ElanMedoff/use-search-param-state/blob/master/package.json)

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
  return _useSearchParamState(searchParam, initialState, {
    sanitize: yourSanitizer,
    ...options,
  });
}

function Demo() {
  const schema = z.number();
  const [counterState, setCounterState] = useSearchParamState("counter", 0, {
    validate: z.number().parse,
  });
}
```

## Explanation

On the first render, `useSearchParamState` will read from the `counter` URL search param. The `counter` search param is read using the return value of the `useURLSearchParams` hook.

If the `window` object is `undefined` (i.e on the server), `useSearchParamState` will use the `serverSideURLSearchParams` option. If `serverSideURLSearchParams` is also not provided, `counterState` will be returned initial state (i.e. `0`).

If the `counter` search param does not exist (i.e. `URLSearchParams.get` returns `null`), `counterState` will be returned as the initial state, and the `counter` search param will be set to the initial state using the `stringify` option. If `enableSetInitialSearchParam` is set to `false`, the `counter` search param will not be set.

Once the `counter` search param is accessed, the raw string is passed to `sanitize`, the output of `sanitize` is passed to `parse`, and finally the output of `parse` is passed to `validate`. Note that `useSearchParamState` aims to return a _parsed_ value, not a _stringified_ value!

If `sanitize`, `parse`, or `validate` throw an error, the `onError` option is called and `counterState` will be returned as the initial state.

If none of `sanitize`, `parse`, and `validate` throw an error, `counterState` is returned as the sanitized, parsed, and validated value in the `counter` search param.

---

When setting the `counter` search param using `setCounterState`, the new state is stringified with the `stringify` option, and the URL is set using the `pushURLSearchParams` option. If `setCounterState` is called with the `replace` option, the `replaceURLSearchParams` option is used instead of the `pushURLSearchParams` option.

If `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

If `stringify` or `pushURLSearchParams`/`replaceURLSearchParams` throw an error, `onError` will be called and the URL will not be set.

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
import { useURLSearchParams } from "use-search-param-state/use-url-search-params";
```

## `useSearchParamState` vs `getSearchParam`/`setSearchParam`

`use-search-param-state` exports three main utilities: `useSearchParamState`, `getSearchParam`, and `setSearchParam`.

The primary difference between `useSearchParamState` and `getSearchParam`/`setSearchParam` is that `useSearchParamState` is a hook, while `getSearchParam`/`setSearchParam` are functions. Because of this difference, `useSearchParamState` is able to react to URL changes and always return the up-to-date search param value, while `getSearchParam` provides a snapshot of the search param value at the time when it was called. Similarly, `setSearchParam` will not force `getSearchParam` to re-evaluate.

In React components, prefer to use `useSearchParamState`. When the search param needs to be read or set outside React, `getSearchParam`/`setSearchParam` are hook-less alternatives with the same API.

## Option reference

````ts
interface OptionReference {
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

  /**
   * A React hook to return a URLSearchParams object representing the current search
   * params. Note that this hook _must_ return a referentially stable value.
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

  /**
   * If `true`, when setting the search param, the updated URL will replace the top item
   * in the history stack instead of pushing to it.
   *
   * See MDN's documentation on [replaceState](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
   * for more info.
   */
  replace?: boolean;
}
````

## `useSearchParamState` options

```ts
interface UseSearchParamStateOptions<TVal> {
  onError?: (error: unknown) => void;

  // read options
  serverSideURLSearchParams?: URLSearchParams;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;

  // write options
  stringify?: (valToStringify: TVal) => string;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: TVal) => boolean;
  pushURLSearchParams?: (urlSearchParams: URLSearchParams) => void;
  replaceURLSearchParams?: (urlSearchParams: URLSearchParams) => void;

  // hook-only options
  enableSetInitialSearchParam?: boolean;
  useURLSearchParams?: () => URLSearchParams;
}
```

## `getSearchParam` options

```ts
interface GetSearchParamOptions<TVal> {
  onError?: (error: unknown) => void;

  // read options
  serverSideURLSearchParams?: URLSearchParams;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => TVal;
  validate?: (unvalidated: unknown) => TVal;

  // function-only options
  getURLSearchParams?: () => URLSearchParams;
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
  pushURLSearchParams?: (urlSearchParams: URLSearchParams) => void;
  replaceURLSearchParams?: (urlSearchParams: URLSearchParams) => void;

  // function-only options
  getURLSearchParams?: () => URLSearchParams;
  replace?: boolean;
}
```

## Recipes

### Kitchen sink

```ts
/*
 * - `parse`/`stringify` the `list` serach param as `?list=1_2_3` instead of `?list=%5B1%2C2%2C3%5D`
 * - `validate` the parsed list as an array of numbers
 * - delete the `list` search param when the current list has a length of 0
 */
const [list, setList] = useSearchParamState<number[]>("list", [], {
  deleteEmptySearchParam: true,
  isEmptySearchParam: (currList) => {
    return currList.length === 0;
  },
  parse: (unparsed) => {
    return unparsed.split("_").map((val) => Number(val));
  },
  validate: z.array(z.number()).parse,
  stringify: (currList) => {
    return currList.join("_");
  },
});
```

### Hooking into the Next.js Pages router

```ts
import React from "react";
import {
  useSearchParamState as _useSearchParamState,
  UseSearchParamStateOptions,
} from "use-search-param-state";
import { useRouter } from "next/router";
import { NextPageContext, InferGetServerSidePropsType } from "next";
import { stringify } from "querystring";

export function useSearchParamState<TVal>(
  searchParam: string,
  initialState: TVal,
  options: UseSearchParamStateOptions<TVal> = {},
) {
  const router = useRouter();

  function pushURLSearchParams(urlSearchParams: URLSearchParams) {
    const maybeQuestionmark = urlSearchParams.toString().length ? "?" : "";
    router.push(
      `${router.pathname}${maybeQuestionmark}${urlSearchParams.toString()}`,
      undefined,
      { shallow: true },
    );
  }

  function replaceURLSearchParams(urlSearchParams: URLSearchParams) {
    const maybeQuestionmark = urlSearchParams.toString().length ? "?" : "";
    router.replace(
      `${router.pathname}${maybeQuestionmark}${urlSearchParams.toString()}`,
      undefined,
      { shallow: true },
    );
  }

  return _useSearchParamState(searchParam, initialState, {
    pushURLSearchParams,
    replaceURLSearchParams,
    ...options,
  });
}

function Page({
  serverSideSearchString,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [count, setCount] = useSearchParamState("count", 0, {
    serverSideURLSearchParams: new URLSearchParams(serverSideSearchString),
  });
}

export function getServerSideProps(ctx: NextPageContext) {
  const dummyURL = new URL(ctx.req?.url ?? "", "http://a.com");
  const serverSideSearchString = dummyURL.search;

  return {
    props: {
      serverSideSearchString,
    },
  };
}
```
