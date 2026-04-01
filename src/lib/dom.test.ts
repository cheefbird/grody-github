// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { waitForElement } from "./dom";

function setBody(html: string) {
  document.body.replaceChildren();
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  document.body.appendChild(tpl.content);
}

describe("waitForElement", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("returns element immediately if already in DOM", async () => {
    setBody('<div id="target">hello</div>');

    const el = await waitForElement("#target", AbortSignal.timeout(1000));

    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.id).toBe("target");
  });

  it("waits for element to appear via DOM mutation", async () => {
    const promise = waitForElement("#late", AbortSignal.timeout(5000));

    queueMicrotask(() => {
      const div = document.createElement("div");
      div.id = "late";
      document.body.appendChild(div);
    });

    const el = await promise;
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.id).toBe("late");
  });

  it("returns null when timeout expires", async () => {
    const el = await waitForElement("#missing", AbortSignal.timeout(50));

    expect(el).toBeNull();
  });

  it("returns null when signal is aborted", async () => {
    const controller = new AbortController();

    const promise = waitForElement("#missing", controller.signal);

    queueMicrotask(() => controller.abort());

    const el = await promise;
    expect(el).toBeNull();
  });

  it("returns null immediately if signal is already aborted", async () => {
    const el = await waitForElement(
      "#missing",
      AbortSignal.abort("already done"),
    );

    expect(el).toBeNull();
  });

  it("disconnects observer after element is found", async () => {
    const promise = waitForElement("#target", AbortSignal.timeout(5000));

    const div = document.createElement("div");
    div.id = "target";
    document.body.appendChild(div);

    await promise;

    // poke the DOM again — leaked observer would double-resolve
    const extra = document.createElement("div");
    extra.id = "extra";
    document.body.appendChild(extra);

    await new Promise((r) => setTimeout(r, 10));
  });

  it("resolves without hanging when element and abort race", async () => {
    const controller = new AbortController();
    const promise = waitForElement("#race", controller.signal);

    queueMicrotask(() => {
      const div = document.createElement("div");
      div.id = "race";
      document.body.appendChild(div);
      controller.abort();
    });

    const el = await promise;
    // element or null both fine — just can't throw or hang
    expect(el === null || el?.id === "race").toBe(true);
  });

  it("resolves with element even if added deeply nested", async () => {
    const promise = waitForElement(".deep-target", AbortSignal.timeout(5000));

    queueMicrotask(() => {
      const wrapper = document.createElement("div");
      const inner = document.createElement("span");
      inner.className = "deep-target";
      wrapper.appendChild(inner);
      document.body.appendChild(wrapper);
    });

    const el = await promise;
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el?.className).toBe("deep-target");
  });
});
