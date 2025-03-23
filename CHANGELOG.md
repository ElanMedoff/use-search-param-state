# Change Log

<!-- ## 0.0.0 - yyyy-mm-dd -->
<!---->
<!-- ### Changed -->
<!---->
<!-- ### Added -->
<!---->
<!-- ### Fixed -->

## 3.0.0 - 2025-03-22

### Changed

- (Breaking) When the search param value resolves to `null`, replace the URL with the search param set to stringified initial state.
- New `enableSetInitialSearchParam` option to control this behavior.
- New `replaceState` option passed to `setState` returned by `useSearchParamState`.

- Internal refactor to remove React context.
- New `buildGetSearchParam` to build a non-reactive search param getter function.
- New `getSearchParam` export that's the return value of `buildGetSearchParam` with no options passed.
- New `buildSetSearchParam` to build a non-reactive search param setter function.
- New `setSearchParam` export that's the return value of `buildSetSearchParam` with no options passed.
- New option `useURL` to let the user adapt the package for their own routing library.
- Export a new hook, `useURL` from `'use-search-param-state/use-url'`.

## 2.0.16 - 2024-06-09

### Fixed

- Add eslint rule to forbid skipped tests.
- Fixed skipped tests (no code itself needed to be fixed).

## 2.0.15 - 2024-05-06

### Fixed

- Fix a bug where `useStableMemo` wasn't using the most up-to-date props.

## 2.0.14 - 2024-05-01

### Fixed

- Add `useStableCallback` and `useStableMemo` hooks to simpilify the ref-based solution introduced in 2.0.11.

## 2.0.13 - 2024-04-27

### Fixed

- Fixed a typo of the package name in the README.

## 2.0.12 - 2024-04-27

### Fixed

- Update vitest to jest, vite to tsup. Clean up eslint, prettier, and typescript options.

## 2.0.11 - 2024-04-26

### Fixed

- Add all functions passed by the consumer to the various dependency arrays. Uses a ref-based workaround to avoid adding and removing the `popstate` event listener every render.

## 2.0.10 - 2024-04-25

### Fixed

- Add build step to publishing github action.

## 2.0.9 - 2024-04-25

### Fixed

- Add github action to publish to npm with provenance.

## 2.0.8 - 2024-04-25

### Fixed

- Avoid calling `pushState` with an empty string.

## 2.0.7 - 2024-03-29

### Fixed

- Avoid overriding search params that aren't managed by the hook.

## 2.0.6 - 2024-03-23

### Fixed

- Fix race condition when multiple instance of `useSearchParamState` were attempting to set the URL in the same render.

## 2.0.5 - 2024-03-22

### Fixed

- Update the README to reflect the change in 2.0.4

## 2.0.4 - 2024-03-22

### Fixed

- Remove URL setting on the first render: was causing an where navigating backwards would cause an infinite loop.

## 2.0.3 - 2024-02-28

### Fixed

- Update `defaultParse` to use `Number` instead of `parseFloat`: was causing an issue where strings starting with a number were parsed as numbers

## 2.0.2 - 2024-01-25

### Fixed

- Add testing, known limitation section to the README.

## 2.0.1 - 2024-01-09

### Fixed

- Add test to check re-render on `popstate` events.

## 2.0.0 - 2024-01-09

### Changed

- Update `serverSideURL` type from `string | URL` to `string` to maintain referential stability.

### Fixed

- Remove unnecessary returns in `defaultParse`.
- Remove unnecessary even listeners - `pushstate` and `replacestate` events are not valid.
- Update `vitest` to version >`1.0.0`.

## 1.2.1 - 2024-01-05

### Fixed

- Fix images on the README on npm.

## 1.2.0 - 2023-12-26

### Added

- Added `deleteEmptySearchParam` and `isEmptySearchParam` options.

## 1.1.2 - 2023-12-25

### Fixed

- Fixed the type of `serverSideURL` in the README and intellisense comments (type in code was fine).

## 1.1.1 - 2023-12-24

### Fixed

- Wrote comments on types for editor intellisense.

## 1.1.0 - 2023-12-18

### Added

- Re-read the search param and re-render the hook on `pushstate` and `replacestate` events.

## 1.0.0 - 2023-12-13

### Changed

- Functioning hook!
