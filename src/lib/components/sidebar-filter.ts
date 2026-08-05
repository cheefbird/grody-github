import { type ComponentProps, mount } from "svelte";
import type { SidebarFilterProps } from "@/lib/types";
import SidebarFilter from "./SidebarFilter.svelte";

export type MountedSidebarFilter = ReturnType<typeof mount>;

export function mountSidebarFilter<T>(
  target: HTMLElement,
  props: SidebarFilterProps<T>,
): MountedSidebarFilter {
  return mount(SidebarFilter, {
    target,
    props: props as ComponentProps<typeof SidebarFilter>,
  });
}
