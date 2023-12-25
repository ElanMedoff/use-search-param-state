# useSearchParamState

A hook to synchronize React state with URL search params.

---

[![npm](https://img.shields.io/npm/v/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-search-param-state)](https://bundlephobia.com/package/use-search-param-state)
[![npm](https://img.shields.io/npm/dw/use-search-param-state)](https://www.npmjs.com/package/use-search-param-state)
[![NPM](https://img.shields.io/npm/l/use-search-param-state)](https://github.com/ElanMedoff/use-search-param-state/blob/master/LICENSE)
[![Static Badge](https://img.shields.io/badge/dependencies%20-%200%20-%20green)](https://github.com/ElanMedoff/use-search-param-state/blob/master/package.json)

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
  const [counter, setCounter] = useSearchParamState("counter", 0);
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
  const [counter, setCounter] = useSearchParamState("counter", 0, {
    validate: schema.parse,
  });
}
```

## Options

`useSearchParamState` accepts the following options:

```tsx
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

`sanitize` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `sanitize` option is passed to both, only the `sanitize` passed to `useSearchParamState` will be called.

`sanitize` has no default value.

### `parse`

A function with the following type: `(unparsed: string) => T`.

The result of `sanitize` is passed as the `unparsed` argument to `parse`.

`parse` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `parse` option is passed to both, only the `parse` passed to `useSearchParamState` will be called.

`parse` defaults:

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

`validate` is expected to validate and return the `unvalidated` argument passed to it (presumably of type `T`), or throw an error. If an error is thrown, `onError` is called and `useSearchParamState` returns the initial state.

`validate` has no default value.

### `stringify`

A function with the following type: `(val: T) => string`.

`stringify` is used to dehydrate the search param state before setting the stringified value in the URL.

`stringify` can be passed directly to `useSearchParamState`, or to `SearchParamStateProvider`. When a `stringify` option is passed to both, only the `stringify` passed to `useSearchParamState` will be called.

`stringify` defaults:

```tsx
function defaultStringify<T>(val: T) {
  // avoid wrapping strings in quotes
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}
```

### `serverSideURL`

A value of type `string` or `URLSearchParams`.

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
