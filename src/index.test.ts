import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { describe, expect, it, beforeEach } from "@jest/globals";
import {
  buildGetSearchParam,
  buildUseSearchParamState,
  getSearchParam,
} from "./index";
import type {
  BuildGetSearchParamOptions,
  BuildUseSearchParamStateOptions,
} from "./index";
import * as helpers from "./helpers";
import { z } from "zod";

describe("useSearchParamState", () => {
  let pushStateSpy: jest.SpyInstance;
  let replaceStateSpy: jest.SpyInstance;

  function getPushStateURLString() {
    if (!Array.isArray(pushStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(pushStateSpy.mock.lastCall[0] instanceof URL)) {
      throw new Error("lastCall[0] is not a URL");
    }
    return pushStateSpy.mock.lastCall[0].toString();
  }

  function getReplaceStateURLString() {
    if (!Array.isArray(replaceStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(replaceStateSpy.mock.lastCall[0] instanceof URL)) {
      throw new Error("lastCall[0] is not a URL");
    }
    return replaceStateSpy.mock.lastCall[0].toString();
  }

  beforeEach(() => {
    jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(false);
    pushStateSpy = jest.spyOn(helpers, "defaultPushState").mockImplementation();
    replaceStateSpy = jest
      .spyOn(helpers, "defaultReplaceState")
      .mockImplementation();
  });

  afterEach(() => {
    jest.spyOn(helpers, "defaultPushState").mockReset();
    jest.spyOn(helpers, "defaultReplaceState").mockReset();
  });

  describe("default state", () => {
    describe("with window undefined", () => {
      beforeEach(() => {
        jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(true);
      });

      it("with a serverSideURL, it should dehydrate the search param", () => {
        const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, {
            serverSideURL: new URL("https://elanmed.dev/?counter=1"),
          }),
        );
        expect(result.current[0]).toBe(1);
      });

      it("without a serverSideURL, it should return the initial state", () => {
        const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return the initial state",
      (fnName) => {
        const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
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

    it("with a search param in the url, it should sanitize, parse, and validate the search param", () => {
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
    });

    describe("without a search param in the url", () => {
      it("should return and set the initial state as the search param", () => {
        const buildOptions = {
          useURL: () => new URL("https://elanmed.dev/"),
        };

        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);

        expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(1);
        expect(getReplaceStateURLString()).toBe(
          "https://elanmed.dev/?counter=0",
        );
      });
    });
  });

  describe("setState", () => {
    describe("when setting the url succeeds", () => {
      it("should set the state", () => {
        const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=10");
      });

      it("should not override unrelated search params", () => {
        const buildOptions = {
          useURL: () => new URL("https://elanmed.dev/?name=elan"),
        };
        const useSearchParamState = buildUseSearchParamState(buildOptions);
        const { result } = renderHook(() => useSearchParamState("counter", 0));
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe(
          "https://elanmed.dev/?name=elan&counter=10",
        );
      });
    });

    describe("when setting the url fails", () => {
      it("should not set the state", () => {
        const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
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
      const buildOptions = { useURL: () => new URL("https://elanmed.dev/") };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(0);
      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?counter=1");
    });

    it("should accept a replace option", () => {
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?counter=1"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
      act(() => {
        result.current[1](2, { replace: true });
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(1);
      expect(getReplaceStateURLString()).toBe("https://elanmed.dev/?counter=2");
    });
  });

  describe("hook options", () => {
    it("when a stringify option is passed, it should use it", () => {
      const buildOptions = {
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
      const buildOptions = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
          sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
        }),
      );
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe(
        "<script>alert('hello, world')</script>",
      );
    });

    it("when a parse option is passed, it should use it", () => {
      const buildOptions = {
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
      const buildOptions = {
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
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
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
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
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
      const buildOptions = {
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

    it("when a replaceState option is passed, it should use it", () => {
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const replaceState = jest.fn();
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          replaceState,
        }),
      );
      expect(replaceState).toHaveBeenCalledTimes(1);
    });

    it("when an enableSetInitialSearchParam option is passed, it should use it", () => {
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          enableSetInitialSearchParam: false,
        }),
      );
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use it", () => {
      const buildOptions = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() => useSearchParamState("name", "elan"));
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe(
        "<script>alert('hello, world')</script>",
      );
    });

    it("when a parse option is passed, it should use it", () => {
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
        useURL: () => new URL("https://elanmed.dev/?name=a_b_c"),
        parse: (unparsed) => unparsed.split("_"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() => useSearchParamState("name", "elan"));
      expect(result.current[0]).toStrictEqual(["a", "b", "c"]);
      expect(result.current[0]).not.toBe("a_b_c");
    });

    it("when a deleteEmptySearchParam option is passed, it should use it", () => {
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
        deleteEmptySearchParam: true,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("name", "elan"));
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/?name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use it", () => {
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
        deleteEmptySearchParam: true,
        isEmptySearchParam: (searchParamVal) => searchParamVal === null,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() => useSearchParamState("name", "elan"));
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("https://elanmed.dev/?name=");
      expect(getPushStateURLString()).not.toBe("https://elanmed.dev/");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use it", () => {
      const pushState = jest.fn();
      const buildOptions = {
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

    it("when a replaceState option is passed, it should use it", () => {
      const replaceState = jest.fn();
      const buildOptions = {
        replaceState,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() => useSearchParamState("counter", 0));
      expect(replaceState).toHaveBeenCalledTimes(1);
    });

    it("when an enableSetInitialSearchParam option is passed, it should use it", () => {
      const buildOptions = {
        enableSetInitialSearchParam: false,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() => useSearchParamState("counter", 0));
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use it", () => {
      const onError = jest.fn();
      const buildOptions = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
        useURL: () =>
          new URL(
            "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
          ),
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, "_"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
          sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
        }),
      );
      expect(result.current[0]).toBe("alert('hello, world')");
      expect(result.current[0]).not.toBe("_alert('hello, world')_");
    });

    it("when a parse option is passed, it should use the hook option", () => {
      const buildOptions = {
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
      const buildOptions = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
        deleteEmptySearchParam: true,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
        useURL: () => new URL("https://elanmed.dev/?name=elan"),
        deleteEmptySearchParam: true,
        isEmptySearchParam: (searchParamVal) => searchParamVal === null,
      };

      const useSearchParamState = buildUseSearchParamState(buildOptions);
      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
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
      const buildOptions = {
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

    it("when a replaceState option is passed, it should use the hook option", () => {
      const buildReplaceState = jest.fn();
      const hookReplaceState = jest.fn();
      const buildOptions = {
        replaceState: buildReplaceState,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          replaceState: hookReplaceState,
        }),
      );
      expect(hookReplaceState).toHaveBeenCalledTimes(1);
      expect(buildReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an enableSetInitialSearchParam option is passed, it should use the hook option", () => {
      const buildOptions = {
        enableSetInitialSearchParam: true,
        useURL: () => new URL("https://elanmed.dev/"),
      };
      const useSearchParamState = buildUseSearchParamState(buildOptions);

      renderHook(() =>
        useSearchParamState("counter", 0, {
          enableSetInitialSearchParam: false,
        }),
      );
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use both options", () => {
      const hookOnError = jest.fn();
      const buildOnError = jest.fn();
      const buildOptions = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
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
      const buildOptions: BuildUseSearchParamStateOptions<unknown> = {
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

describe("getSearchParam", () => {
  beforeEach(() => {
    jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(false);
  });

  describe("default state", () => {
    describe("with window undefined", () => {
      beforeEach(() => {
        jest.spyOn(helpers, "isWindowUndefined").mockReturnValue(true);
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { href: "https://elanmed.dev/" } as Location;
        });
      });

      it("with a serverSideURL, it should dehydrate the search param", () => {
        const result = getSearchParam("counter", {
          serverSideURL: new URL("https://elanmed.dev/?counter=1"),
        });
        expect(result).toBe(1);
      });

      it("without a serverSideURL, it should return null", () => {
        const result = getSearchParam("counter");
        expect(result).toBe(null);
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return null",
      (fnName) => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { href: "https://elanmed.dev/" } as Location;
        });

        const result = getSearchParam("counter", {
          [fnName]: () => {
            throw new Error();
          },
        });
        expect(result).toBe(null);
      },
    );

    it("with a search param in the url, it should sanitize, parse, and validate the search param", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { href: "https://elanmed.dev/?counter=1" } as Location;
      });

      const result = getSearchParam("counter");
      expect(result).toBe(1);
    });

    it("without a search param in the url, it should return null", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { href: "https://elanmed.dev" } as Location;
      });

      const result = getSearchParam("counter");
      expect(result).toBe(null);
    });
  });

  describe("local function options", () => {
    it("when a sanitize option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
        } as Location;
      });

      const result = getSearchParam("name", {
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
      });
      expect(result).toBe("alert('hello, world')");
      expect(result).not.toBe("<script>alert('hello, world')</script>");
    });

    it("when a parse option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=a_b_c",
        } as Location;
      });

      const result = getSearchParam("name", {
        parse: (unparsed) => unparsed.split("_"),
      });
      expect(result).toStrictEqual(["a", "b", "c"]);
      expect(result).not.toBe("a_b_c");
    });

    it("when a validate option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=asdf",
        } as Location;
      });

      const result = getSearchParam("counter", {
        validate: z.number().parse,
      });
      expect(result).toBe(null);
    });

    it("when an onError option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=asdf",
        } as Location;
      });
      const onError = jest.fn();

      getSearchParam("counter", {
        onError,
        validate: z.number().parse,
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options", () => {
    it("when a sanitize option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
        } as Location;
      });
      const buildOptions: BuildGetSearchParamOptions<unknown> = {
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
      };
      const getSearchParam = buildGetSearchParam(buildOptions);

      const result = getSearchParam("name");
      expect(result).toBe("alert('hello, world')");
      expect(result).not.toBe("<script>alert('hello, world')</script>");
    });

    it("when a parse option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=a_b_c",
        } as Location;
      });
      const buildOptions: BuildGetSearchParamOptions<unknown> = {
        parse: (unparsed) => unparsed.split("_"),
      };
      const getSearchParam = buildGetSearchParam(buildOptions);
      const result = getSearchParam("name");
      expect(result).toStrictEqual(["a", "b", "c"]);
      expect(result).not.toBe("a_b_c");
    });

    it("when a getURL option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=1",
        } as Location;
      });

      const buildOptions: BuildGetSearchParamOptions<unknown> = {
        getURL: () => new URL("https://elanmed.dev/?counter=2"),
      };
      const getSearchParam = buildGetSearchParam(buildOptions);
      const result = getSearchParam("counter");
      expect(result).toStrictEqual(2);
      expect(result).not.toBe(1);
    });

    it("when an onError option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=asdf",
        } as Location;
      });
      const onError = jest.fn();
      const buildOptions = {
        onError,
      };

      const getSearchParam = buildGetSearchParam(buildOptions);
      getSearchParam("counter", { validate: z.number().parse });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("build options with overriding hook options", () => {
    it("when a sanitize option is passed, it should use the hook option", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=<script>alert('hello, world')</script>",
        } as Location;
      });
      const buildOptions: BuildGetSearchParamOptions<unknown> = {
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, "_"),
      };
      const getSearchParam = buildGetSearchParam(buildOptions);

      const result = getSearchParam("name", {
        sanitize: (unsanitized) => unsanitized.replaceAll(/<\/?script>/g, ""),
      });
      expect(result).toBe("alert('hello, world')");
      expect(result).not.toBe("_alert('hello, world')_");
    });

    it("when a parse option is passed, it should use the hook option", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?name=a_b_c",
        } as Location;
      });
      const buildOptions = {
        parse: JSON.parse,
      };
      const getSearchParam = buildGetSearchParam(buildOptions);

      const result = getSearchParam("name", {
        parse: (unparsed) => unparsed.split("_"),
      });
      expect(result).toStrictEqual(["a", "b", "c"]);
      expect(result).not.toBe("a_b_c");
    });

    it("when an onError option is passed, it should use both options", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=asdf",
        } as Location;
      });
      const localOnError = jest.fn();
      const buildOnError = jest.fn();
      const buildOptions = {
        onError: buildOnError,
      };
      const getSearchParam = buildGetSearchParam(buildOptions);

      getSearchParam("counter", {
        validate: z.number().parse,
        onError: localOnError,
      });
      expect(buildOnError).toHaveBeenCalledTimes(1);
      expect(localOnError).toHaveBeenCalledTimes(1);
    });
  });
});
