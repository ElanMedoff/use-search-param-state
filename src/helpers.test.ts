import { describe, expect, it } from "vitest";
import {
  defaultIsEmptySearchParam,
  defaultParse,
  defaultStringify,
} from "./helpers";

describe("defaultParse", () => {
  it.each([
    ["", ""],
    ["undefined", undefined],
    ["null", null],
    ["true", true],
    ["false", false],
    ["123", 123],
    ["123.45", 123.45],
    ["123n", 123],
    [JSON.stringify([123]), [123]],
    ["[123", "[123"],
    ["hello", "hello"],
  ])("defaultParse(%s)", (a, b) => {
    expect(defaultParse(a)).toStrictEqual(b);
  });
});

describe("defaultStringify", () => {
  it.each([
    ["hello", "hello"],
    [[1, 2, 3], JSON.stringify([1, 2, 3])],
  ])("defaultParse(%s)", (a, b) => {
    expect(defaultStringify(a)).toStrictEqual(b);
  });
});

describe("defaultIsEmptySearchParam", () => {
  it.each([
    [null, true],
    [undefined, true],
    ["", true],
    [0, false],
  ])("defaultIsEmptySearchParam(%s)", (a, b) => {
    expect(defaultIsEmptySearchParam(a)).toStrictEqual(b);
  });
});
