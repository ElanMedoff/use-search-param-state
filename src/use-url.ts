import { useSyncExternalStore } from "use-sync-external-store/shim";

const customEventNames = ["pushState", "replaceState"] as const;
const eventNames = ["popstate", ...customEventNames] as const;

// from Wouter: https://github.com/molefrog/wouter/blob/110b6694a9b3220460eed32640fa4778d10bdf52/packages/wouter/src/use-browser-location.js#L57
const patchKey = Symbol.for("use-search-param-state");
if (
  typeof history !== "undefined" &&
  // @ts-expect-error type issues indexing with a symbol
  typeof window[patchKey] === "undefined"
) {
  for (const eventName of customEventNames) {
    const original = history[eventName];
    history[eventName] = function (...args) {
      const originalRes = original.apply(this, args);
      dispatchEvent(new Event(eventName));
      return originalRes;
    };
  }
  Object.defineProperty(window, patchKey, { value: true });
}

const subscribeToEventUpdates = (callback: (event: Event) => void) => {
  for (const eventName of eventNames) {
    window.addEventListener(eventName, callback);
  }
  return () => {
    for (const eventName of eventNames) {
      window.removeEventListener(eventName, callback);
    }
  };
};

const getSnapshot = () => window.location.href;

function useURL() {
  const href = useSyncExternalStore(
    subscribeToEventUpdates,
    getSnapshot,
    getSnapshot,
  );

  return new URL(href);
}

export { useURL };
