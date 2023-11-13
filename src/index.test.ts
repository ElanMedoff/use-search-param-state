import { renderHook, cleanup, act } from "@testing-library/react-hooks";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { useSearchParamState } from "./index";
import * as helpers from "./helpers";

// TODO: write tests on options, build options vs hook options

afterEach(cleanup);

function expectPushStateToHaveBeenCalledWith(href: string) {
  expect(window.history.pushState).toHaveBeenCalledWith({}, "", href);
}

describe("useSearchParamState", () => {
  beforeEach(() => {
    vi.spyOn(window.history, "pushState");
    vi.spyOn(helpers, "isWindowUndefined").mockReturnValue(false);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost:3000/" },
    });
  });

  describe("default state", () => {
    describe("with window undefined", () => {
      beforeEach(() => {
        vi.spyOn(helpers, "isWindowUndefined").mockReturnValue(true);
      });

      it("with a serverSideHref, it should dehydrate the search param", () => {
        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, {
            serverSideHref: "http://localhost:3000/?counter=1",
          })
        );
        expect(result.current[0]).toBe(1);
      });

      it("without a serverSideHref, it should use the initialState arg and call onError", () => {
        const onError = vi.fn();
        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, { onError })
        );
        expect(result.current[0]).toBe(0);
        expect(onError).toHaveBeenCalledTimes(1);
      });
    });

    it("with no search param in the url, it should use the initialState arg and set the search param", () => {
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(0);
      expectPushStateToHaveBeenCalledWith("http://localhost:3000/?counter=0");
    });

    it("with a search param in the url, it should dehydrate the search param", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "http://localhost:3000/?counter=1" },
      });

      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
    });
  });

  describe("setState", () => {
    function expectSetStateToBehaveProperly(
      setStateArg: Parameters<
        ReturnType<typeof useSearchParamState<number>>[1]
      >[0]
    ) {
      it("when setting the url succeeds, it should set the state", async () => {
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);
        expectPushStateToHaveBeenCalledWith("http://localhost:3000/?counter=0");
        act(() => {
          result.current[1](setStateArg);
        });
        expect(result.current[0]).toBe(10);
        expectPushStateToHaveBeenCalledWith(
          "http://localhost:3000/?counter=10"
        );
      });

      describe("when setting the url fails", () => {
        it("should still set the state", () => {
          const { result } = renderHook(() =>
            useSearchParamState("counter", 0, {
              pushState: () => {
                throw new Error();
              },
            })
          );
          expect(result.current[0]).toBe(0);
          act(() => {
            result.current[1](setStateArg);
          });
          expect(result.current[0]).toBe(10);
        });

        it("when rollbackOnError is true, it should not set the state", () => {
          const { result } = renderHook(() =>
            useSearchParamState("counter", 0, {
              pushState: () => {
                throw new Error();
              },
              rollbackOnError: true,
            })
          );
          expect(result.current[0]).toBe(0);
          act(() => {
            result.current[1](setStateArg);
          });
          expect(result.current[0]).toBe(0);
        });
      });
    }

    expectSetStateToBehaveProperly(10);
    expectSetStateToBehaveProperly(() => 10);
  });
});
