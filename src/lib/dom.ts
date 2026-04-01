/**
 * helper that waits for a DOM element matching `selector` to appear.
 * returns the element, or `null` if the signal aborts first.
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  signal: AbortSignal,
): Promise<T | null> {
  const existing = document.querySelector<T>(selector);
  if (existing) return Promise.resolve(existing);

  if (signal.aborted) return Promise.resolve(null);

  return new Promise<T | null>((resolve) => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (el) {
        cleanup();
        resolve(el);
      }
    });

    function cleanup() {
      observer.disconnect();
      signal.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      resolve(null);
    }

    signal.addEventListener("abort", onAbort);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}
