# use-search-param-state

A hook to synchronize React state with URL search params.

[![npm](https://img.shields.io/npm/v/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-search-param-state)](https://bundlephobia.com/package/use-search-param-state)
[![npm](https://img.shields.io/npm/dw/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![NPM](https://img.shields.io/npm/l/use-search-param-state)](https://github.com/ElanMedoff/use-search-param-state/blob/master/LICENSE)
[![Static Badge](https://img.shields.io/badge/dependencies%20-%200%20-%20green)](https://github.com/ElanMedoff/use-search-param-state/blob/master/package.json)

<!-- a hack to get around github sanitizing styles from markdown  -->
<br>
<p align="center">
    <img src="https://elanmed.dev/npm-packages/use-search-param-state-logo.png" width="500px" />
</p>

## Basic usage

```tsx
import { useSearchParamState } from "use-search-param-state";

function Root() {
  return (
    <SearchParamStateProvider>
      <Demo />
    </SearchParamStateProvider>
  );
}

function Demo() {
  const [counterState, setCounterState] = useSearchParamState("counter", 0);
}
```

or

```tsx
import { useSearchParamState } from "use-search-param";
import { z } from "zod";

function Root() {
  // this `sanitize` is used by every instance of `useSearchParamState`
  const sanitize = (unsanitized: string) => yourSanitizer(unsanitized);
  return (
    <SearchParamStateProvider buildOptions={{ sanitize }}>
      <Demo />
    </SearchParamStateProvider>
  );
}

function Demo() {
  const schema = z.number();
  const [counterState, setCounterState] = useSearchParamState("counter", 0, {
    validate: schema.parse,
  });
}
```

## Explanation

On the first render, `useSearchParamState` will set `counterState` to the value read from the `counter` URL search param.

By default, the `counter` search param is read using `window.location.href`. If the `window` object is `undefined`, `useSearchParamState` will use the `serverSideURL` instead to read from the URL. If `serverSideURL` is also not provided, `counterState` will be set to the initial state (i.e. `0`).

If the `counter` search param does not exist (i.e. `URLSearchParams.get` returns `null`), `counterState` will be set to the initial state.

Once the `counter` search param is accessed, the raw string is passed to `sanitize`, the output of `sanitize` is passed to `parse`, and finally the output of `parse` is passed to `validate`. Note that `useSearchParamState` aims to return a _parsed_ value, not a _stringified_ value!

If `sanitize`, `parse`, or `validate` throw an error, a few things happen:

1. The `onError` option is called.
2. `counterState` will be set to the initial state.
3. The `counter` search param in the URL will be set to the initial state. The initial state is stringified using the `stringify` option, and the URL is set using the `pushState` option. If `stringify` or `pushState` throw an error, `onError` will be called and the URL will not be set.

If none of `sanitize`, `parse`, and `validate` throw an error, `counterState` is set to the sanitized, parsed, and validated value in the `counter` search param.

Additionally, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

---

When setting the state using `setCounterState`, the new state is stringified using the `stringify` option, and the URL is set using the `pushState` option.

If `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

However, if `stringify` or `pushState` throw an error, `onError` will be called and the URL will not be set. Additionally, if the `rollbackOnError` option is set to `true`, `counterState` will be set to its value prior to when `setCounterState` was called. Otherwise, `counterState` will retain its new value, and the `counter` URL search param will be out of sync with `counterState`. The latter behavior is the default, since local state tends to take precedence over URL state - URL state is generally a nice-to-have method to preserve local state across URL changes/refreshes.

## Options

`useSearchParamState` accepts the following options:

```tsx
interface UseSearchParamStateOptions<T> {
  stringify?: (valToStringify: T) => string;
  sanitize?: (unsanitized: string) => string;
  parse?: (unparsed: string) => T;
  validate?: (unvalidated: unknown) => T;
  deleteEmptySearchParam?: boolean;
  isEmptySearchParam?: (searchParamVal: T) => boolean;
  serverSideURL?: string | URL;
  rollbackOnError?: boolean;
  pushState?: (href: string) => void;
  onError?: (e: unknown) => void;
}
```

Note that `sanitize`, `parse`, and `validate` run in the following order when pulling the initial state from the URL search param:

```tsx
// simplified
const rawSearchParam = new URLSearchParams(window.location.search).get(
  searchParam
);
const sanitized = options.sanitize(rawSearchParam);
const parsed = options.parse(sanitized);
const validated = options.validate(parsed);

return validated;
```

### `sanitize`

A function with the following type: `(unsanitized: string) => string`.

`sanitize` is called with the raw string pulled from the URL search param.

If `sanitize` throws an error, `onError` will be called, `useSearchParamState` will return the initial state, and the URL will be set with the initial state using `pushState`.

`sanitize` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `sanitize` option is passed to both, only the `sanitize` passed to `useSearchParamState` will be called.

`sanitize` has no default value.

### `parse`

A function with the following type: `(unparsed: string) => T`.

The result of `sanitize` is passed as the `unparsed` argument to `parse`.

If `parse` throws an error, `onError` will be called, `useSearchParamState` will return the initial state, and the URL will be set with the initial state using `pushState`.

`parse` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `parse` option is passed to both, only the `parse` passed to `useSearchParamState` will be called.

`parse` defaults to:

```ts
export function defaultParse(unparsed: string) {
  if (unparsed === "null") return null;
  if (unparsed === "undefined") return undefined;
  if (unparsed === "true") return true;
  if (unparsed === "false") return false;

  const maybeNum = parseFloat(unparsed);
  if (!Number.isNaN(maybeNum)) return maybeNum;

  try {
    return JSON.parse(unparsed);
  } catch {
    return unparsed;
  }
}
```

### `validate`

A function with the following type: `(unvalidated: unknown) => T`.

The result of `parse` is passed as the `unvalidated` argument to `validate`.

`validate` is expected to validate and return the `unvalidated` argument passed to it (presumably of type `T`), or throw an error. If `validate` throws an error, `onError` will be called, `useSearchParamState` will return the initial state, and the URL will be set with the initial state using `pushState`.

`validate` has no default value.

### `deleteEmptySearchParam`

A `boolean`.

On first render, or when calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

`deleteEmptySearchParam` defaults to `false`.

### `isEmptySearchParam`

A function with the following type: `(searchParamVal: T) => boolean;`.

On first render, or when calling the `setState` function returned by `useSearchParamState`, if `deleteEmptySearchParam` is `true` and `isEmptySearchParam` returns `true`, the search param will be deleted from the URL.

`isEmptySearchParam` defaults to:

```ts
function defaultIsEmptySearchParam<T>(searchParamVal: T) {
  return (
    searchParamVal === null ||
    searchParamVal === undefined ||
    searchParamVal === ""
  );
}
```

### `stringify`

A function with the following type: `(valToStringify: T) => string`.

`stringify` is used to dehydrate the search param state before setting the stringified value in the URL.

If `stringify` throws an error, `onError` will be called and the URL will not be set.

`stringify` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `stringify` option is passed to both, only the `stringify` passed to `useSearchParamState` will be called.

`stringify` defaults to:

```tsx
function defaultStringify<T>(valToStringify: T) {
  // avoid wrapping strings in quotes
  if (typeof valToStringify === "string") return valToStringify;
  return JSON.stringify(valToStringify);
}
```

### `serverSideURL`

A value of type `string` or `URL`.

When passed, `serverSideURL` will be used when `window` is `undefined` to access the URL search param. This is useful for generating content on the server, i.e. with Next.js:

```tsx
import url from "url";

export const getServerSideProps: GetServerSideProps = ({ req }) => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const serverSideURL = `${protocol}://${req.headers.host}${req.url}`;

  return {
    props: { serverSideURL },
  };
};

export default function Home({
  serverSideURL,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [counter] = useSearchParamState("counter", 0, {
    serverSideURL,
  });

  // has the correct value for `counter` when rendered on the server
  return <div>counter: {counter}</div>;
}
```

Note that if no `serverSideURL` option is passed and `window` is `undefined`, you may encounter hydration errors.

### `rollbackOnError`

A `boolean`.

When calling the `setState` function returned by `useSearchParamState`, `pushState` will be called to set the URL search param with the latest React state value. If setting the search param in the URL throws an error, and `rollbackOnError` is set to `true`, the local React state will "rollback" to its previous value.

`rollbackOnError` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `rollbackOnError` option is passed to both, only the `rollbackOnError` passed to `useSearchParamState` will be called.

`rollbackOnError` defaults to `false`.

### `pushState`

A function with the following type: `(href: string) => void`.

`pushState` is called to set the search param state in the URL.

`pushState` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `pushState` option is passed to both, only the `pushState` passed to `useSearchParamState` will be called.

`pushState` defaults to:

```tsx
function defaultPushState(href: string) {
  window.history.pushState({}, "", href);
}
```

### `onError`

A function with the following type: `(e: unknown) => void`.

Most actions in `useSearchParamState` are wrapped in a `try` `catch` block - `onError` is called whenever the `catch` block is reached. This includes situations when `sanitize`, `parse`, or `validate` throw an error.

`onError` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When an `onError` option is passed to both, both the functions will be called.
