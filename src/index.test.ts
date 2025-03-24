import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { describe, expect, it, beforeEach } from "@jest/globals";
import { getSearchParam, setSearchParam, useSearchParamState } from "./index";
import * as helpers from "./helpers";
import { z } from "zod";

describe("useSearchParamState", () => {
  let pushStateSpy: jest.SpyInstance;
  let replaceStateSpy: jest.SpyInstance;

  function getPushStateURLString() {
    if (!Array.isArray(pushStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(pushStateSpy.mock.lastCall[0] instanceof URLSearchParams)) {
      throw new Error("lastCall[0] is not an instance of URLSearchParams");
    }
    return pushStateSpy.mock.lastCall[0].toString();
  }

  function getReplaceStateURLString() {
    if (!Array.isArray(replaceStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(replaceStateSpy.mock.lastCall[0] instanceof URLSearchParams)) {
      throw new Error("lastCall[0] is not an instance of URLSearchParams");
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

      it("with a serverSideURLSearchParams, it should dehydrate the search param", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, {
            serverSideURLSearchParams: new URLSearchParams("?counter=1"),
          }),
        );
        expect(result.current[0]).toBe(1);
      });

      it("without a serverSideURLSearchParams, it should return the initial state", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return the initial state",
      (fnName) => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

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
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?counter=1" } as Location;
      });

      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
    });

    describe("without a search param in the url", () => {
      it("should return and set the initial state as the search param", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

        const { result } = renderHook(() => useSearchParamState("counter", 0));
        expect(result.current[0]).toBe(0);

        expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(1);
        expect(getReplaceStateURLString()).toBe("counter=0");
      });
    });
  });

  describe("setState", () => {
    describe("when setting the url succeeds", () => {
      it("should set the state", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

        const { result } = renderHook(() => useSearchParamState("counter", 0));
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("counter=10");
      });

      it("should not override unrelated search params", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "?name=elan" } as Location;
        });

        const { result } = renderHook(() => useSearchParamState("counter", 0));
        act(() => {
          result.current[1](10);
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("name=elan&counter=10");
      });
    });

    describe("when setting the url fails", () => {
      it("should not set the state", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
        });

        const { result } = renderHook(() =>
          useSearchParamState("counter", 0, {
            stringify: () => {
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
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "" } as Location;
      });

      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(0);
      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
      expect(getPushStateURLString()).toBe("counter=1");
    });

    it("should accept a replace option", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?counter=1" } as Location;
      });

      const { result } = renderHook(() => useSearchParamState("counter", 0));
      expect(result.current[0]).toBe(1);
      act(() => {
        result.current[1](2, { replace: true });
      });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(1);
      expect(getReplaceStateURLString()).toBe("counter=2");
    });
  });

  describe("options", () => {
    it("when a stringify option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "" } as Location;
      });

      const { result } = renderHook(() =>
        useSearchParamState<string[]>("name", [], {
          stringify: (valToStringify) => valToStringify.join("_"),
        }),
      );
      act(() => {
        result.current[1](["a", "b", "c"]);
      });
      expect(getPushStateURLString()).toBe("name=a_b_c");
      expect(getPushStateURLString()).not.toBe(
        `https://elanmed.dev/?name=${JSON.stringify(["a", "b", "c"])}`,
      );
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a sanitize option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?name=<script>alert('hello, world')</script>",
        } as Location;
      });

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
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?name=a_b_c" } as Location;
      });

      const { result } = renderHook(() =>
        useSearchParamState("name", [], {
          parse: (unparsed) => unparsed.split("_"),
        }),
      );
      expect(result.current[0]).toStrictEqual(["a", "b", "c"]);
      expect(result.current[0]).not.toBe("a_b_c");
    });

    it("when a validate option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?counter=asdf" } as Location;
      });

      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          validate: z.number().parse,
        }),
      );
      expect(result.current[0]).toBe(0);
    });

    it("when a deleteEmptySearchParam option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?name=elan" } as Location;
      });

      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
          deleteEmptySearchParam: true,
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("");
      expect(getPushStateURLString()).not.toBe("name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?name=elan" } as Location;
      });

      const { result } = renderHook(() =>
        useSearchParamState("name", "elan", {
          deleteEmptySearchParam: true,
          isEmptySearchParam: (searchParamVal) => searchParamVal === null,
        }),
      );
      act(() => {
        result.current[1]("");
      });
      expect(getPushStateURLString()).toBe("name=");
      expect(getPushStateURLString()).not.toBe("");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?counter=1" } as Location;
      });

      const pushState = jest.fn();
      const { result } = renderHook(() =>
        useSearchParamState("counter", 0, {
          pushState,
        }),
      );
      act(() => {
        result.current[1](1);
      });
      expect(pushState).toHaveBeenCalledTimes(1);
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
    });

    it("when a replaceState option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "" } as Location;
      });

      const replaceState = jest.fn();
      renderHook(() =>
        useSearchParamState("counter", 0, {
          replaceState,
        }),
      );
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
    });

    it("when an enableSetInitialSearchParam option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "" } as Location;
      });

      renderHook(() =>
        useSearchParamState("counter", 0, {
          enableSetInitialSearchParam: false,
        }),
      );
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "?counter=asdf" } as Location;
      });

      const onError = jest.fn();
      renderHook(() =>
        useSearchParamState("counter", 0, {
          onError,
          validate: z.number().parse,
        }),
      );
      expect(onError).toHaveBeenCalledTimes(1);
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
          return { search: "" } as Location;
        });
      });

      it("with a serverSideURLSearchParams, it should dehydrate the search param", () => {
        const result = getSearchParam("counter", {
          serverSideURLSearchParams: new URLSearchParams("?counter=1"),
        });
        expect(result).toBe(1);
      });

      it("without a serverSideURLSearchParams, it should return null", () => {
        const result = getSearchParam("counter");
        expect(result).toBe(null);
      });
    });

    it.each([["sanitize"], ["parse"], ["validate"]])(
      "when %s errors, it should return null",
      (fnName) => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return { search: "" } as Location;
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
        return { search: "?counter=1" } as Location;
      });

      const result = getSearchParam("counter");
      expect(result).toBe(1);
    });

    it("without a search param in the url, it should return null", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return { search: "https://elanmed.dev" } as Location;
      });

      const result = getSearchParam("counter");
      expect(result).toBe(null);
    });
  });

  describe("options", () => {
    it("when a sanitize option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?name=<script>alert('hello, world')</script>",
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
          search: "?name=a_b_c",
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
          search: "?counter=asdf",
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
          search: "?counter=asdf",
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
});

describe("setSearchParam", () => {
  let pushStateSpy: jest.SpyInstance;
  let replaceStateSpy: jest.SpyInstance;

  function getPushStateURLString() {
    if (!Array.isArray(pushStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(pushStateSpy.mock.lastCall[0] instanceof URLSearchParams)) {
      throw new Error("lastCall[0] is not an instance of URLSearchParams");
    }
    return pushStateSpy.mock.lastCall[0].toString();
  }

  function getReplaceStateURLString() {
    if (!Array.isArray(replaceStateSpy.mock.lastCall)) {
      throw new Error("lastCall is not an array");
    }
    if (!(replaceStateSpy.mock.lastCall[0] instanceof URLSearchParams)) {
      throw new Error("lastCall[0] is not an instance of URLSearchParams");
    }
    return replaceStateSpy.mock.lastCall[0].toString();
  }

  beforeEach(() => {
    pushStateSpy = jest.spyOn(helpers, "defaultPushState").mockImplementation();
    replaceStateSpy = jest
      .spyOn(helpers, "defaultReplaceState")
      .mockImplementation();
  });

  afterEach(() => {
    jest.spyOn(helpers, "defaultPushState").mockReset();
    jest.spyOn(helpers, "defaultReplaceState").mockReset();
  });

  describe("setState", () => {
    describe("when setting the url succeeds", () => {
      it("should set the state", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return {
            search: "",
          } as Location;
        });

        setSearchParam("counter", 10);
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("counter=10");
      });

      it("should not override unrelated search params", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return {
            search: "?name=elan",
          } as Location;
        });

        setSearchParam("counter", 10);
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
        expect(getPushStateURLString()).toBe("name=elan&counter=10");
      });
    });

    describe("when setting the url fails", () => {
      it("should not set the state", () => {
        jest.spyOn(window, "location", "get").mockImplementation(() => {
          return {
            search: "",
          } as Location;
        });

        setSearchParam("counter", 0, {
          stringify: () => {
            throw new Error();
          },
        });
        expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
      });
    });

    it("should accept a replace option", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?counter=1",
        } as Location;
      });

      setSearchParam("counter", 2, { replace: true });
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(1);
      expect(getReplaceStateURLString()).toBe("counter=2");
    });
  });

  describe("options", () => {
    it("when a stringify option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "",
        } as Location;
      });

      setSearchParam("name", ["a", "b", "c"], {
        stringify: (valToStringify) => valToStringify.join("_"),
      });
      expect(getPushStateURLString()).toBe("name=a_b_c");
      expect(getPushStateURLString()).not.toBe(
        `https://elanmed.dev/?name=${JSON.stringify(["a", "b", "c"])}`,
      );
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a deleteEmptySearchParam option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?name=elan",
        } as Location;
      });

      setSearchParam("name", "", {
        deleteEmptySearchParam: true,
      });
      expect(getPushStateURLString()).toBe("");
      expect(getPushStateURLString()).not.toBe("name=");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a isEmptySearchParam option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?name=elan",
        } as Location;
      });

      setSearchParam("name", "", {
        deleteEmptySearchParam: true,
        isEmptySearchParam: (searchParamVal) => searchParamVal === null,
      });
      expect(getPushStateURLString()).toBe("name=");
      expect(getPushStateURLString()).not.toBe("");
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(1);
    });

    it("when a pushState option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "",
        } as Location;
      });

      const pushState = jest.fn();
      setSearchParam("counter", 1, {
        pushState,
      });
      expect(pushState).toHaveBeenCalledTimes(1);
      expect(helpers.defaultPushState).toHaveBeenCalledTimes(0);
    });

    it("when a replaceState option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "",
        } as Location;
      });

      const replaceState = jest.fn();
      setSearchParam("counter", 0, {
        replaceState,
        replace: true,
      });
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(helpers.defaultReplaceState).toHaveBeenCalledTimes(0);
    });

    it("when an onError option is passed, it should use it", () => {
      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          search: "?counter=asdf",
        } as Location;
      });

      const onError = jest.fn();
      setSearchParam("counter", 0, {
        stringify: () => {
          throw new Error();
        },
        onError,
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
