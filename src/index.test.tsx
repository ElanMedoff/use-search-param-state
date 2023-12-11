import React from "react";
import {
  renderHook as _renderHook,
  cleanup,
  act,
} from "@testing-library/react-hooks";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { SearchParamStateProvider, useSearchParamState } from "./index";
import type { UseBuildSearchParamStateOptions } from "./index";
import * as helpers from "./helpers";
import { z } from "zod";

afterEach(cleanup);

function expectPushStateToHaveBeenCalledWith(href: string) {
  expect(window.history.pushState).toHaveBeenCalledWith({}, "", href);
}

describe("useSearchParamState", () => {
  let buildOptions: UseBuildSearchParamStateOptions;
  beforeEach(() => {
    vi.spyOn(window.history, "pushState");
    vi.spyOn(helpers, "isWindowUndefined").mockReturnValue(false);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost:3000/" },
    });
    buildOptions = {};
  });

  function wrappedRenderHook<TProps, TResult>(
    cb: Parameters<typeof _renderHook<TProps, TResult>>[0]
  ) {
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <SearchParamStateProvider options={buildOptions}>
        {children}
      </SearchParamStateProvider>
    );

    return _renderHook<TProps, TResult>(cb, { wrapper });
  }

  describe("default state", () => {
    describe("with window undefined", () => {
      beforeEach(() => {
        vi.spyOn(helpers, "isWindowUndefined").mockReturnValue(true);
      });

      it("with a serverSideURL, it should dehydrate the search param", () => {
        const { result } = wrappedRenderHook(() =>
          useSearchParamState("counter", 0, {
            serverSideURL: "http://localhost:3000/?counter=1",
          })
        );
        expect(result.current[0]).toBe(1);
      });

      it("without a serverSideURL, it should use the initialState arg", () => {
        const { result } = wrappedRenderHook(() =>
          useSearchParamState("counter", 0)
        );
        expect(result.current[0]).toBe(0);
      });
    });

    it("with no search param in the url, it should use the initialState arg and set the search param", () => {
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      expect(result.current[0]).toBe(0);
      expectPushStateToHaveBeenCalledWith("http://localhost:3000/?counter=0");
    });

    it("with a search param in the url, it should dehydrate the search param", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "http://localhost:3000/?counter=1" },
      });

      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      expect(result.current[0]).toBe(1);
    });
  });

  describe("setState", () => {
    // TODO
    function expectSetStateToWork(setStateArg: any) {
      it("when setting the url succeeds, it should set the state", async () => {
        const { result } = wrappedRenderHook(() =>
          useSearchParamState("counter", 0)
        );
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
          const { result } = wrappedRenderHook(() =>
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

        it("when a local rollbackOnError option is true, it should not set the state", () => {
          const { result } = wrappedRenderHook(() =>
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

        it("when a build rollbackOnError option is true, it should not set the state", () => {
          buildOptions = {
            rollbackOnError: true,
          };
          const { result } = wrappedRenderHook(() =>
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
          expect(result.current[0]).toBe(0);
        });
      });
    }

    expectSetStateToWork(10);
    expectSetStateToWork(() => 10);
  });

  describe("hook options", () => {
    beforeEach(() => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "http://localhost:3000/?counter=1" },
      });
    });

    it("when a stringify option is passed, it should use it", () => {
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0, {
          stringify: () => "10",
        })
      );
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expectPushStateToHaveBeenCalledWith("http://localhost:3000/?counter=10");
    });

    it("when a sanitize option is passed, it should use it", () => {
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0, {
          sanitize: (unsanitized) => `${unsanitized}2`,
        })
      );
      expect(result.current[0]).toBe(12);
    });

    it("when a parse option is passed, it should use it", () => {
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0, {
          parse: (unparsed) => JSON.parse(unparsed) + 1,
        })
      );
      expect(result.current[0]).toBe(2);
    });

    it("when a validate option is passed, it should use it", () => {
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0, {
          validate: (unvalidated) => (unvalidated as number) + 1,
        })
      );
      expect(result.current[0]).toBe(2);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = vi.fn();
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0, {
          pushState,
        })
      );
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expect(pushState).toHaveBeenCalledWith(
        "http://localhost:3000/?counter=1"
      );
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = vi.fn();
      const schema = z.string();
      wrappedRenderHook(() =>
        useSearchParamState("counter", 0 as any as string, {
          onError,
          validate: schema.parse,
        })
      );
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  describe("build options", () => {
    beforeEach(() => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { href: "http://localhost:3000/?counter=1" },
      });
    });

    it("when a stringify option is passed, it should use it", () => {
      buildOptions = {
        stringify: () => "10",
      };
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expectPushStateToHaveBeenCalledWith("http://localhost:3000/?counter=10");
    });

    it("when a sanitize option is passed, it should use it", () => {
      buildOptions = {
        sanitize: (unsanitized) => `${unsanitized}2`,
      };
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      expect(result.current[0]).toBe(12);
    });

    it("when a parse option is passed, it should use it", () => {
      buildOptions = {
        parse: (unparsed) => JSON.parse(unparsed) + 1,
      };
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      expect(result.current[0]).toBe(2);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = vi.fn();
      buildOptions = {
        pushState,
      };
      const { result } = wrappedRenderHook(() =>
        useSearchParamState("counter", 0)
      );
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expect(pushState).toHaveBeenCalledWith(
        "http://localhost:3000/?counter=1"
      );
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = vi.fn();
      buildOptions = {
        onError,
      };
      const schema = z.string();
      wrappedRenderHook(() =>
        useSearchParamState("counter", 0 as any as string, {
          validate: schema.parse,
        })
      );
      expect(onError).toHaveBeenCalledOnce();
    });
  });

  // TODO: test build options overriding hook options
  // TODO: test use context failing
  // TODO: test using multiple hooks
});
