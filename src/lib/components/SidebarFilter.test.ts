// @vitest-environment happy-dom
import { render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { ListResult } from "@/lib/types";
import SidebarFilter from "./SidebarFilter.svelte";

type Item = { name: string };

function makeProps(overrides: Record<string, unknown> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const items: Item[] = [
    { name: "CI" },
    { name: "Deploy" },
    { name: "Release" },
  ];
  return {
    container,
    fetch: vi
      .fn<() => Promise<ListResult<Item>>>()
      .mockResolvedValue({ ok: true, items }),
    placeholder: "Filter things...",
    emptyText: "No things match your filter.",
    getSearchText: (item: Item) => item.name,
    getHref: (item: Item) => `/x/y/${item.name}`,
    getLabel: (item: Item) => item.name,
    ...overrides,
  };
}

function renderFilter(props: ReturnType<typeof makeProps>) {
  return render(SidebarFilter, props as ComponentProps<typeof SidebarFilter>);
}

describe("SidebarFilter", () => {
  it("renders the search input after a successful fetch", async () => {
    renderFilter(makeProps());
    const input = await screen.findByRole("searchbox", {
      name: "Filter things",
    });
    expect(input).toBeTruthy();
  });

  it("renders nothing when the fetch returns an empty list", async () => {
    const props = makeProps({
      fetch: vi.fn().mockResolvedValue({ ok: true, items: [] }),
    });
    renderFilter(props);
    await vi.waitFor(() => expect(props.fetch).toHaveBeenCalled());
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it.each([
    ["rate-limited", "Rate limited — add a token in extension options"],
    ["auth-required", "Private repo — add a token in extension options"],
  ])("shows a hint when fetch fails with %s", async (reason, text) => {
    const props = makeProps({
      fetch: vi.fn().mockResolvedValue({ ok: false, reason }),
    });
    renderFilter(props);
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it("filters items by search text, multi-term", async () => {
    const user = userEvent.setup();
    renderFilter(makeProps());
    const input = await screen.findByRole("searchbox");

    await user.type(input, "dep");
    expect(await screen.findByText("Deploy")).toBeTruthy();
    expect(screen.queryByText("Release")).toBeNull();
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    renderFilter(makeProps());
    const input = await screen.findByRole("searchbox");

    await user.type(input, "zzz");
    expect(
      await screen.findByText("No things match your filter."),
    ).toBeTruthy();
  });

  it("renders result links via getHref and applies linkAttrs", async () => {
    const user = userEvent.setup();
    renderFilter(
      makeProps({
        linkAttrs: { "data-turbo-frame": "repo-content-turbo-frame" },
      }),
    );
    const input = await screen.findByRole("searchbox");

    await user.type(input, "ci");
    const link = (await screen.findByText("CI")).closest("a");
    expect(link?.getAttribute("href")).toBe("/x/y/CI");
    expect(link?.getAttribute("data-turbo-frame")).toBe(
      "repo-content-turbo-frame",
    );
  });

  it("toggles data-filtering on the container as the query changes", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    renderFilter(props);
    const input = await screen.findByRole("searchbox");

    expect(props.container.hasAttribute("data-filtering")).toBe(false);
    await user.type(input, "ci");
    expect(props.container.hasAttribute("data-filtering")).toBe(true);
    await user.clear(input);
    expect(props.container.hasAttribute("data-filtering")).toBe(false);
  });

  it("clears the query via the clear button", async () => {
    const user = userEvent.setup();
    renderFilter(makeProps());
    const input = await screen.findByRole<HTMLInputElement>("searchbox");

    await user.type(input, "ci");
    await user.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(input.value).toBe("");
  });
});
