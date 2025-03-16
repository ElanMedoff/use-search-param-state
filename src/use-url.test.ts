import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { describe, expect, it, beforeEach } from "@jest/globals";
import { useURL } from "./use-url";

describe("useURL", () => {
  beforeEach(() => {
    jest.spyOn(window, "location", "get").mockImplementation(() => {
      return {
        href: "https://elanmed.dev/?counter=1",
      } as Location;
    });
  });

  it("should update the state on the popstate event", () => {
    const { result } = renderHook(() => useURL());
    expect(result.current.toString()).toBe("https://elanmed.dev/?counter=1");

    jest.spyOn(window, "location", "get").mockImplementation(() => {
      return {
        href: "https://elanmed.dev/?counter=2",
      } as Location;
    });
    act(() => {
      dispatchEvent(new Event("popstate"));
    });
    expect(result.current.toString()).toBe("https://elanmed.dev/?counter=2");
  });

  it.each(["pushState", "replaceState"] as const)(
    "should update the state on the %s event",
    (eventName) => {
      const { result } = renderHook(() => useURL());
      expect(result.current.toString()).toBe("https://elanmed.dev/?counter=1");

      jest.spyOn(window, "location", "get").mockImplementation(() => {
        return {
          href: "https://elanmed.dev/?counter=2",
        } as Location;
      });
      act(() => {
        history[eventName](null, "", "");
      });
      expect(result.current.toString()).toBe("https://elanmed.dev/?counter=2");
    },
  );
});
