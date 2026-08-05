import { type ComponentProps, mount } from "svelte";
import type { SidebarFilterProps } from "@/lib/types";
import SidebarFilter from "./SidebarFilter.svelte";

export type MountedSidebarFilter = ReturnType<typeof mount>;

// The mount target is always the container the hide rule keys off of, so it's
// derived here rather than passed twice.
export function mountSidebarFilter<T>(
  target: HTMLElement,
  props: Omit<SidebarFilterProps<T>, "container">,
): MountedSidebarFilter {
  return mount(SidebarFilter, {
    target,
    props: { ...props, container: target } as ComponentProps<
      typeof SidebarFilter
    >,
  });
}
