<script lang="ts">
import {
  type GitHubStatusData,
  indicatorColor,
  RESOLVED_COLOR,
  type StatusIndicator,
  timeSince,
} from "@/lib/github-status";
import StatusPopover from "./StatusPopover.svelte";
import StatusStrip from "./StatusStrip.svelte";

let {
  statusData,
  collapsed,
  oncollapse,
  onexpand,
}: {
  statusData: GitHubStatusData | null;
  collapsed: boolean;
  oncollapse: () => void;
  onexpand: () => void;
} = $props();

let popoverOpen = $state(false);

let hasIncidents = $derived((statusData?.incidents.length ?? 0) > 0);

const SEVERITY_ORDER: StatusIndicator[] = [
  "critical",
  "major",
  "minor",
  "none",
];
// Returns "none" when only resolved incidents remain.
// The UI handles this via isResolved + RESOLVED_COLOR overrides.
let severity = $derived.by<StatusIndicator>(() => {
  if (!statusData || !hasIncidents) return "none";
  const active = statusData.incidents.filter((i) => i.status !== "resolved");
  if (active.length === 0) return "none";
  for (const level of SEVERITY_ORDER) {
    if (active.some((i) => i.impact === level)) return level;
  }
  return statusData.indicator;
});

let affectedNames = $derived.by(() => {
  const names = new Set<string>();
  for (const incident of statusData?.incidents ?? []) {
    if (incident.status === "resolved") continue;
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
  resolved: "Resolved",
};

let { statusLabel, startedTime, isResolved } = $derived.by(() => {
  if (!statusData || !hasIncidents)
    return { statusLabel: "", startedTime: "", isResolved: false };

  // Prefer worst active incident
  for (const level of SEVERITY_ORDER) {
    const match = statusData.incidents.find(
      (i) => i.impact === level && i.status !== "resolved",
    );
    if (match) {
      return {
        statusLabel: STATUS_LABELS[match.status] ?? match.status,
        startedTime: match.started_at ? timeSince(match.started_at) : "",
        isResolved: false,
      };
    }
  }

  // All resolved — use first resolved incident
  const resolved = statusData.incidents.find((i) => i.status === "resolved");
  if (resolved) {
    const ts =
      resolved.resolved_at || resolved.updated_at || resolved.started_at;
    return {
      statusLabel: "Resolved",
      startedTime: ts ? timeSince(ts) : "",
      isResolved: true,
    };
  }

  const fallback = statusData.incidents[0];
  return {
    statusLabel: fallback?.status ?? "",
    startedTime: fallback?.started_at ? timeSince(fallback.started_at) : "",
    isResolved: false,
  };
});

let accentColor = $derived(
  isResolved ? RESOLVED_COLOR : indicatorColor(severity),
);

function handleCollapse() {
  popoverOpen = false;
  oncollapse();
}

function handleExpand() {
  onexpand();
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
        <span class="title"
          >GitHub incident — {isResolved ? "Resolved" : summaryText}</span
        >
        <span class="subtitle"
          >{statusLabel}
          {#if startedTime}
            &middot; {isResolved ? "" : "Started "}{startedTime}
          {/if}</span
        >
      </div>
      <span class="actions">
        <button
          type="button"
          class="details-btn"
          onclick={handleTogglePopover}
          aria-expanded={popoverOpen}
        >
          Details
        </button>
        <button
          type="button"
          class="dismiss-btn"
          onclick={handleCollapse}
          aria-label="Dismiss"
        >
          &#x2715;
        </button>
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
  <StatusStrip {severity} resolved={isResolved} onexpand={handleExpand} />
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
  background: var(--bgColor-inset, #161b22);
  border: 1px solid var(--borderColor-default, #30363d);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 8px 16px;
  box-shadow: var(--shadow-floating-small, 0 4px 12px rgba(0, 0, 0, 0.4));
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
  color: var(--fgColor-default, #e6edf3);
  font-weight: 500;
  white-space: nowrap;
}

.subtitle {
  color: var(--fgColor-muted, #8b949e);
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
  background: var(--button-default-bgColor-rest, #21262d);
  color: var(--button-default-fgColor-rest, #e6edf3);
  padding: 3px var(--control-small-paddingInline-condensed, 0.5rem);
  border-radius: var(--borderRadius-medium, 0.375rem);
  font-size: 12px;
  border: 1px solid var(--button-default-borderColor-rest, #30363d);
  cursor: pointer;
  font-family: inherit;
}

.dismiss-btn {
  background: none;
  border: none;
  color: var(--fgColor-muted, #8b949e);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}
</style>
