import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { describe, expect, it, beforeEach } from "@jest/globals";
import { buildUseSearchParamState } from "./index";
import type { BuildUseSearchParamStateOptions } from "./index";
import * as helpers from "./helpers";
import { z } from "zod";

describe("useSearchParamState", () => {
  let buildOptions: BuildUseSearchParamStateOptions<unknown>;
  let pushStateSpy: jest.SpyInstance;

  function getPushStateURLString() {
    if (!Array.isArray(pushStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(pushStateSpy.mock.lastCall[0] instanceof URL)) {
      throw new Error("lastCall[0] is not a URL");
    }
    return pushStateSpy.mock.lastCall[0].toString();
  }

  beforeEach(() => {
    jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(false);
    pushStateSpy = jest.spyOn(helpers, "defaultPushState").mockImplementation();

    buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
  });

  afterEach(() => {
    jest.spyOn(helpers, "defaultPushState").mockReset();
  });

  describe("default state", () => {
    describe("with window undefined", () => {
      beforeEach(() => {
        jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(true);
      });

      it("with a serverSideURL, it should dehydrate the search param", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", {
            serverSideURL: new URL("https://elanmed.dev/?counter=1"),
          }),
        );
        expect(result.current[0]).toBe(1);
      });

      describe("without a serverSideURL", () => {
        it("with an defaultState, it should return the option", () => {
          const useSearchParamState = buildUseSearchParamState(buildOptions);
          const { result } = renderHook(() =>
            useSearchParamState("counter", { defaultState: 0 }),
          );
          expect(result.current[0]).toBe(0);
        });

        it("without an defaultState, it should return null", () => {
          const useSearchParamState = buildUseSearchParamState(buildOptions);
          const { result } = renderHook(() => useSearchParamState("counter"));
          expect(result.current[0]).toBe(null);
        });
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return null",
      (fnName) => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", {
            [fnName]: () => {
              throw new Error();
            },
          }),
        );
        expect(result.current[0]).toBe(null);
        expect(helpers.defaultPushState).not.toHaveBeenCalled();
      },
    );

    it("with a search param in the url, it should dehydrate the search param", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter"));
      expect(result.current[0]).toBe(1);
    });
  });

  describe("setState", () => {
    describe("when setting the url succeeds", () => {
      it("should set the state", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter"));
        expect(result.current[0]).toBe(null);
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
      });

      it("should not override unrelated search params", () => {
        buildOptions = { useURL: () => new URL("https://elanmed.dev/?asdf=1") };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter"));
        expect(result.current[0]).toBe(null);
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe(
          "https://elanmed.dev/?asdf=1&counter=10",
        );
      });
    });

    describe("when setting the url fails", () => {
      it("should not set the state", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", {
            pushState: () => {
              throw new Error();
            },
          }),
        );
        expect(result.current[0]).toBe(null);
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).not.toHaveBeenCalled();
      });

      it("when deleteEmptySearchParam is true and the new state is empty, it should delete the search param", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", {
            defaultState: 0,
            deleteEmptySearchParam: true,
            isEmptySearchParam: (val) => val === 10,
          }),
        );
        expect(result.current[0]).toBe(0);
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      });
    });

    it("should accept a setter function", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          defaultState: 0,
        }),
      );
      expect(result.current[0]).toBe(0);
      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=1");
    });
  });

  describe("hook options", () => {
    beforeEach(() => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
    });

    it("when a stringify option is passed, it should use it", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          stringify: () => "10",
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a sanitize option is passed, it should use it", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          sanitize: (unsanitized) => `${unsanitized}2`,
        }),
      );
      expect(result.current[0]).toBe(12);
    });

    it("when a parse option is passed, it should use it", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          parse: (unparsed) => (JSON.parse(unparsed) as number) + 1,
        }),
      );
      expect(result.current[0]).toBe(2);
    });

    it("when a validate option is passed, it should use it", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          validate: (unvalidated) => (unvalidated as number) + 1,
        }),
      );
      expect(result.current[0]).toBe(2);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = jest.fn();
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          pushState,
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = jest.fn();
      const schema = z.string();
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      renderHook(() =>
        useSearchParamState("counter", {
          onError,
          validate: schema.parse,
        }),
      );
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options", () => {
    it("when a stringify option is passed, it should use it", () => {
      buildOptions = {
        stringify: () => "10",
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter"));
      act(() => {
        result.current[1](1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
    });

    it("when a sanitize option is passed, it should use it", () => {
      buildOptions = {
        sanitize: (unsanitized) => `${unsanitized}2`,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter"));
      expect(result.current[0]).toBe(12);
    });

    it("when a parse option is passed, it should use it", () => {
      buildOptions = {
        parse: (unparsed) => (JSON.parse(unparsed) as number) + 1,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter"));
      expect(result.current[0]).toBe(2);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = jest.fn();
      buildOptions = {
        pushState,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter"));
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = jest.fn();
      buildOptions = {
        onError,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const schema = z.string();
      renderHook(() =>
        useSearchParamState("counter", {
          validate: schema.parse,
        }),
      );
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options with overriding hook options", () => {
    it("when a stringify option is passed, it should use the hook option", () => {
      buildOptions = {
        stringify: () => "11",
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          stringify: () => "10",
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
    });

    it("when a sanitize option is passed, it should use the hook option", () => {
      buildOptions = {
        sanitize: (unsanitized) => `${unsanitized}1`,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          sanitize: (unsanitized) => `${unsanitized}2`,
        }),
      );
      expect(result.current[0]).toBe(12);
      expect(result.current[0]).not.toBe(11);
    });

    it("when a parse option is passed, it should use the hook option", () => {
      buildOptions = {
        parse: (unparsed) => (JSON.parse(unparsed) as number) + 100,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          parse: (unparsed) => (JSON.parse(unparsed) as number) + 200,
        }),
      );
      expect(result.current[0]).toBe(201);
      expect(result.current[0]).not.toBe(101);
    });

    it("when a pushState option is passed, it should use the hook option", () => {
      const buildPushState = jest.fn();
      const hookPushState = jest.fn();
      buildOptions = {
        pushState: buildPushState,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          pushState: hookPushState,
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(result.current[0]).toBe(1);
      expect(hookPushState).toHaveBeenCalledTimes(1);
      expect(buildPushState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use both options", () => {
      const hookOnError = jest.fn();
      const buildOnError = jest.fn();
      buildOptions = {
        onError: buildOnError,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const schema = z.string();
      renderHook(() =>
        useSearchParamState("counter", {
          validate: schema.parse,
          onError: hookOnError,
        }),
      );
      expect(buildOnError).toHaveBeenCalledTimes(1);
      expect(hookOnError).toHaveBeenCalledTimes(1);
    });

    it("when an isEmptySearchParam is passed, it should use the hook option", () => {
      buildOptions = {
        deleteEmptySearchParam: true,
        isEmptySearchParam: (val) => val === 100,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          isEmptySearchParam: (val) => val === 200,
        }),
      );
      act(() => {
        result.current[1](200);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe(
        "https://elanmed.dev/?counter=200",
      );
    });

    it("when a deleteEmptySearchParam is passed, it should use the hook option", () => {
      buildOptions = {
        deleteEmptySearchParam: false,
        isEmptySearchParam: (val) => val === 0,
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", {
          deleteEmptySearchParam: true,
        }),
      );
      act(() => {
        result.current[1](0);
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe(
        "https://elanmed.dev/?counter=0",
      );
    });
  });
});
