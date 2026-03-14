<script lang="ts">
import { onMount } from "svelte";
import {
  collapsedStorage,
  type GitHubStatusData,
  statusStorage,
} from "@/lib/github-status";
import StatusBanner from "./StatusBanner.svelte";

let statusData: GitHubStatusData | null = $state(null);
let collapsed = $state(false);

function handleCollapse() {
  collapsed = true;
  collapsedStorage.setValue(true).catch((err) => {
    console.warn("[grody-github] Failed to save collapsed state:", err);
    collapsed = false;
  });
}

function handleExpand() {
  collapsed = false;
  collapsedStorage.setValue(false).catch((err) => {
    console.warn("[grody-github] Failed to save expanded state:", err);
    collapsed = true;
  });
}

onMount(() => {
  statusStorage
    .getValue()
    .then((v) => (statusData = v ?? null))
    .catch((err) =>
      console.warn("[grody-github] Failed to hydrate status:", err),
    );
  collapsedStorage
    .getValue()
    .then((v) => (collapsed = v ?? false))
    .catch((err) =>
      console.warn("[grody-github] Failed to hydrate collapsed state:", err),
    );

  const unwatchStatus = statusStorage.watch((v) => (statusData = v ?? null));
  const unwatchCollapsed = collapsedStorage.watch(
    (v) => (collapsed = v ?? false),
  );

  return () => {
    unwatchStatus();
    unwatchCollapsed();
  };
});
</script>

<StatusBanner
  {statusData}
  {collapsed}
  oncollapse={handleCollapse}
  onexpand={handleExpand}
/>
