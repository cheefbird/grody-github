<script lang="ts">
  import type { GitHubStatusData, StatusIndicator } from "@/lib/github-status";
  import { collapsedStorage } from "@/lib/github-status";
  import StatusPopover from "./StatusPopover.svelte";
  import StatusStrip from "./StatusStrip.svelte";

  let { statusData, collapsed: initialCollapsed }: {
    statusData: GitHubStatusData | null;
    collapsed: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let collapsed = $state(initialCollapsed);
  let popoverOpen = $state(false);

  let hasIncidents = $derived(
    (statusData?.incidents.length ?? 0) > 0
  );

  const SEVERITY_ORDER: StatusIndicator[] = ["critical", "major", "minor", "none"];
  let severity = $derived.by<StatusIndicator>(() => {
    if (!statusData || !hasIncidents) return "none";
    for (const level of SEVERITY_ORDER) {
      if (statusData.incidents.some((i) => i.impact === level)) return level;
    }
    return statusData.indicator;
  });

  let affectedNames = $derived.by(() => {
    const names = new Set<string>();
    for (const incident of (statusData?.incidents ?? [])) {
      for (const c of incident.components) {
        names.add(c.name);
      }
    }
    return [...names];
  });

  let summaryText = $derived.by(() => {
    const names = affectedNames;
    if (names.length === 0) return "";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  });

  let accentColor = $derived.by(() => {
    if (severity === "critical") return "#da3633";
    if (severity === "major") return "#f0883e";
    return "#d29922";
  });

  function handleCollapse() {
    collapsed = true;
    popoverOpen = false;
    collapsedStorage.setValue(true);
  }

  function handleExpand() {
    collapsed = false;
    collapsedStorage.setValue(false);
  }

  function handleTogglePopover() {
    popoverOpen = !popoverOpen;
  }

  function handleClosePopover() {
    popoverOpen = false;
  }
</script>

{#if hasIncidents && !collapsed}
  <div
    role="status"
    style="padding:0 0 8px;display:flex;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;position:relative;"
  >
    <div style="display:flex;align-items:center;gap:12px;background:#161b22;border:1px solid #30363d;border-top:none;border-radius:0 0 8px 8px;padding:8px 16px;">
    <div style="width:3px;height:32px;background:{accentColor};border-radius:2px;flex-shrink:0;"></div>
    <span style="color:{accentColor};font-size:14px;flex-shrink:0;">&#9679;</span>
    <div style="display:flex;flex-direction:column;gap:2px;">
      <span style="color:#e6edf3;font-weight:500;">GitHub incident — {summaryText}</span>
      <span style="color:#8b949e;font-size:11px;">Investigating</span>
    </div>
    <span style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:12px;position:relative;">
      <button
        type="button"
        onclick={handleTogglePopover}
        style="background:#21262d;color:#e6edf3;padding:3px 10px;border-radius:12px;font-size:11px;border:1px solid #30363d;cursor:pointer;"
        aria-expanded={popoverOpen}
      >Details</button>
      <button
        type="button"
        onclick={handleCollapse}
        style="background:none;border:none;color:#484f58;cursor:pointer;font-size:14px;padding:0;line-height:1;"
        aria-label="Dismiss"
      >&#x2715;</button>
      {#if popoverOpen && statusData}
        <StatusPopover
          incidents={statusData.incidents}
          onclose={handleClosePopover}
        />
      {/if}
    </span>
    </div>
  </div>
{:else if hasIncidents && collapsed}
  <StatusStrip
    {severity}
    onexpand={handleExpand}
  />
{/if}
