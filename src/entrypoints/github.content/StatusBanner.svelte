<script lang="ts">
  import { collapsedStorage, type GitHubStatusData, indicatorColor, type StatusIndicator } from "@/lib/github-status";
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

  const STATUS_LABELS: Record<string, string> = {
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
  };

  let statusLabel = $derived.by(() => {
    if (!statusData || !hasIncidents) return "";
    for (const level of SEVERITY_ORDER) {
      const match = statusData.incidents.find((i) => i.impact === level);
      if (match) return STATUS_LABELS[match.status] ?? match.status;
    }
    return statusData.incidents[0]?.status ?? "";
  });

  let accentColor = $derived(indicatorColor(severity));

  function handleCollapse() {
    collapsed = true;
    popoverOpen = false;
    collapsedStorage.setValue(true).catch(() => {
      collapsed = false;
    });
  }

  function handleExpand() {
    collapsed = false;
    collapsedStorage.setValue(false).catch(() => {
      collapsed = true;
    });
  }

  function handleTogglePopover() {
    popoverOpen = !popoverOpen;
  }

  function handleClosePopover() {
    popoverOpen = false;
  }
</script>

{#if hasIncidents && !collapsed}
  <div class="banner-root" role="status">
    <div class="drawer-card">
      <div class="accent-bar" style:background={accentColor}></div>
      <span class="severity-dot" style:color={accentColor}>&#9679;</span>
      <div class="info">
        <span class="title">GitHub incident — {summaryText}</span>
        <span class="subtitle">{statusLabel}</span>
      </div>
      <span class="actions">
        <button
          type="button"
          class="details-btn"
          onclick={handleTogglePopover}
          aria-expanded={popoverOpen}
        >Details</button>
        <button
          type="button"
          class="dismiss-btn"
          onclick={handleCollapse}
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
  <StatusStrip {severity} onexpand={handleExpand} />
{/if}

<style>
  .banner-root {
    display: flex;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .drawer-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #161b22;
    border: 1px solid #30363d;
    border-top: none;
    border-radius: 0 0 8px 8px;
    padding: 8px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .accent-bar {
    width: 3px;
    height: 32px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .severity-dot {
    font-size: 14px;
    flex-shrink: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    color: #e6edf3;
    font-weight: 500;
    white-space: nowrap;
  }

  .subtitle {
    color: #8b949e;
    font-size: 11px;
  }

  .actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
    margin-left: 12px;
    position: relative;
  }

  .details-btn {
    background: #21262d;
    color: #e6edf3;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    border: 1px solid #30363d;
    cursor: pointer;
    font-family: inherit;
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: #484f58;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
  }
</style>
