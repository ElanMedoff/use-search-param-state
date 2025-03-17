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
          useSearchParamState("counter", 0, {
            serverSideURL: new URL("https://elanmed.dev/?counter=1"),
          }),
        );
        expect(result.current[0]).toBe(1);
      });

      it("without a serverSideURL, it should return the initial state", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return the initial state",
      (fnName) => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, {
            [fnName]: () => {
              throw new Error();
            },
          }),
        );
        expect(result.current[0]).toBe(0);
        expect(helpers.defaultPushState).not.toHaveBeenCalled();
      },
    );

    it("with a search param in the url, it should dehydrate the search param", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
    });
  });

  describe("setState", () => {
    describe("when setting the url succeeds", () => {
      it("should set the state", () => {
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
      });

      it("should not override unrelated search params", () => {
        buildOptions = { useURL: () => new URL("https://elanmed.dev/?asdf=1") };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
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
          useSearchParamState("counter", 0, {
            pushState: () => {
              throw new Error();
            },
          }),
        );
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
      });
    });

    it("should accept a setter function", () => {
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(0);
      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=1");
    });
  });

  describe("hook options", () => {
    it("when a stringify option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState<string[]>("name", [], {
          stringify: (valToStringify) => valToStringify.join("_"),
        }),
      );
      act(() => {
        result.current[1](["a", "b", "c"]);
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=a_b_c");
      expect(getPushStateURLString()).not.toBe(
        `https://elanmed.dev/?name=${JSON.stringify(["a", "b", "c"])}`,
      );
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a sanitize option is passed, it should use it", () => {
      buildOptions = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
        }),
      );
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe(
        "<script>alert('hello, world')</script>",
      );
    });

    it("when a parse option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=a_b_c"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", [], {
          parse: (unparsed) => unparsed.split("_"),
        }),
      );
      expect(result.current[0]).toStrictEqual(["a", "b", "c"]);
      expect(result.current[0]).not.toBe("a_b_c");
    });

    it("when a validate option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=asdf"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          validate: z.number().parse,
        }),
      );
      expect(result.current[0]).toBe(0);
    });

    it("when a deleteEmptySearchParam option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          deleteEmptySearchParam: true,
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/?name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          deleteEmptySearchParam: true,
          isEmptySearchParam: (searchParamVal) => searchParamVal === null,
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const pushState = jest.fn();
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          pushState,
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it("when an onError option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=asdf"),
      };
      const onError = jest.fn();
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          onError,
          validate: z.number().parse,
        }),
      );
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options", () => {
    it("when a stringify option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/"),
        stringify: (valToStringify) => (valToStringify as string[]).join("_"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState<string[]>("name", []),
      );
      act(() => {
        result.current[1](["a", "b", "c"]);
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=a_b_c");
      expect(getPushStateURLString()).not.toBe(
        `https://elanmed.dev/?name=${JSON.stringify(["a", "b", "c"])}`,
      );
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a sanitize option is passed, it should use it", () => {
      buildOptions = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() => useSearchParamState("name", "foo"));
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe(
        "<script>alert('hello, world')</script>",
      );
    });

    it("when a parse option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=a_b_c"),
        parse: (unparsed) => unparsed.split("_"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() => useSearchParamState("name", "foo"));
      expect(result.current[0]).toStrictEqual(["a", "b", "c"]);
      expect(result.current[0]).not.toBe("a_b_c");
    });

    it("when a deleteEmptySearchParam option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
        deleteEmptySearchParam: true,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("name", "foo"));
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/?name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use it", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
        deleteEmptySearchParam: true,
        isEmptySearchParam: (searchParamVal) => searchParamVal === null,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("name", "foo"));
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = jest.fn();
      buildOptions = {
        pushState,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() => useSearchParamState("counter", 0));
      act(() => {
        result.current[1](1);
      });
      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = jest.fn();
      buildOptions = {
        onError,
        useURL: () => new URL("https://elanmed.dev/?counter=asdf"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      renderHook(() =>
        useSearchParamState("counter", 0, {
          validate: z.number().parse,
        }),
      );
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options with overriding hook options", () => {
    it("when a stringify option is passed, it should use the hook option", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/"),
        stringify: (valToStringify) => (valToStringify as string[]).join("-"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState<string[]>("name", [], {
          stringify: (valToStringify) => valToStringify.join("_"),
        }),
      );
      act(() => {
        result.current[1](["a", "b", "c"]);
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=a_b_c");
      expect(getPushStateURLString()).not.toBe(
        "https://elanmed.dev/?name=a-b-c",
      );
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a sanitize option is passed, it should use the hook option", () => {
      buildOptions = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, "_"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
        }),
      );
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe("_alert('hello, world')_");
    });

    it("when a parse option is passed, it should use the hook option", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=a_b_c"),
        parse: JSON.parse,
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", [], {
          parse: (unparsed) => unparsed.split("_"),
        }),
      );
      expect(result.current[0]).toStrictEqual(["a", "b", "c"]);
      expect(result.current[0]).not.toBe("a_b_c");
    });

    it("when a deleteEmptySearchParam option is passed, it should use the hook option", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
        deleteEmptySearchParam: true,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          deleteEmptySearchParam: false,
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use the hook option", () => {
      buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=foo"),
        deleteEmptySearchParam: true,
        isEmptySearchParam: (searchParamVal) => searchParamVal === null,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "foo", {
          isEmptySearchParam: (searchParamVal) => searchParamVal === "",
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/?name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use the hook option", () => {
      const buildPushState = jest.fn();
      const hookPushState = jest.fn();
      buildOptions = {
        pushState: buildPushState,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          pushState: hookPushState,
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(hookPushState).toHaveBeenCalledTimes(1);
      expect(buildPushState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use both options", () => {
      const hookOnError = jest.fn();
      const buildOnError = jest.fn();
      buildOptions = {
        onError: buildOnError,
        useURL: () => new URL("https://elanmed.dev/?counter=asdf"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          validate: z.number().parse,
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
        useSearchParamState("counter", 0, {
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
        useSearchParamState("counter", 0, {
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
