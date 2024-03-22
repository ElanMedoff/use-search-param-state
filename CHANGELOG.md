# Change Log

<!-- ## 0.0.0 - yyyy-mm-dd -->
<!---->
<!-- ### Changed -->
<!---->
<!-- ### Added -->
<!---->
<!-- ### Fixed -->

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
