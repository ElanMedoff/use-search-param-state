import { renderHook, cleanup } from "@testing-library/react-hooks";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { useSearchParamState } from "./index";

// TODO: write more tests!

afterEach(cleanup);

describe("default state", () => {
  describe.skip("with window undefined", () => {
    beforeEach(() => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });
    });

    it("with a serverSideHref, it should dehydrate the search param", () => {
      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          serverSideHref: "http://localhost:3000/?counter=1",
        }),
      );
      expect(result.current[0]).toBe(1);
    });

    it("without a serverSideHref, it should use the initialState arg and call onError", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, { onError }),
      );
      expect(result.current[0]).toBe(0);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  it("with no search param in the url, it should use the initialState arg", () => {
    const { result } = renderHook(() => useSearchParamState("counter", 0));
    expect(result.current[0]).toBe(0);
  });

  it("with a search param in the url, it should dehydrate the search param", () => {
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost:3000/?counter=1",
      },
      writable: true,
    });
    const { result } = renderHook(() => useSearchParamState("counter", 0));
    expect(result.current[0]).toBe(1);
  });
});
