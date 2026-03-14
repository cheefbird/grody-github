<script lang="ts">
  import type { GitHubStatusData, StatusIndicator } from "@/lib/github-status";
  import { dismissedIncidentsStorage } from "@/lib/github-status";
  import StatusStrip from "./StatusStrip.svelte";
  import StatusPopover from "./StatusPopover.svelte";

  let { statusData, dismissedIds: initialDismissedIds }: {
    statusData: GitHubStatusData | null;
    dismissedIds: string[];
  } = $props();

  let localDismissedIds = $state<string[]>([]);

  $effect(() => {
    localDismissedIds = initialDismissedIds;
  });

  let viewState = $state<"hidden" | "banner" | "strip">("hidden");
  let popoverOpen = $state(false);

  let activeIncidents = $derived(
    statusData?.incidents.filter((i) => !localDismissedIds.includes(i.id)) ?? []
  );

  let hasAnyIncidents = $derived(
    (statusData?.incidents.length ?? 0) > 0
  );

  const SEVERITY_ORDER: StatusIndicator[] = ["critical", "major", "minor", "none"];
  let severity = $derived.by<StatusIndicator>(() => {
    if (!statusData || activeIncidents.length === 0) return "none";
    for (const level of SEVERITY_ORDER) {
      if (activeIncidents.some((i) => i.impact === level)) return level;
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

  let bannerColors = $derived.by(() => {
    const s = severity;
    if (s === "critical") return { bg: "#6e1b1b", border: "#da3633", text: "#f85149", icon: "#f85149" };
    if (s === "major") return { bg: "#6e3a12", border: "#9a6700", text: "#f0883e", icon: "#f0883e" };
    return { bg: "#5c4b1a", border: "#9a6700", text: "#d29922", icon: "#d29922" };
  });

  $effect(() => {
    if (activeIncidents.length > 0 && viewState === "hidden") {
      viewState = "banner";
    } else if (!hasAnyIncidents) {
      viewState = "hidden";
      popoverOpen = false;
    }
  });

  function handleCollapse() {
    const ids = activeIncidents.map((i) => i.id);
    const newDismissed = [...new Set([...localDismissedIds, ...ids])];
    localDismissedIds = newDismissed;
    viewState = "strip";
    popoverOpen = false;
    dismissedIncidentsStorage.setValue(newDismissed);
  }

  function handleExpand() {
    const incidentIds = new Set(statusData?.incidents.map((i) => i.id) ?? []);
    localDismissedIds = localDismissedIds.filter((id) => !incidentIds.has(id));
    viewState = "banner";
    dismissedIncidentsStorage.setValue(localDismissedIds);
  }

  function handleTogglePopover() {
    popoverOpen = !popoverOpen;
  }

  function handleClosePopover() {
    popoverOpen = false;
  }
</script>

{#if viewState === "banner"}
  <div
    role="status"
    style="background:{bannerColors.bg};border-bottom:1px solid {bannerColors.border};padding:8px 16px;display:flex;align-items:center;gap:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;position:relative;"
  >
    <span style="color:{bannerColors.icon};">&#9888;</span>
    <span style="color:{bannerColors.text};font-weight:500;">GitHub is experiencing issues</span>
    {#if summaryText}
      <span style="color:{bannerColors.text};opacity:0.8;">— {summaryText}</span>
    {/if}
    <span style="margin-left:auto;display:flex;gap:8px;">
      <button
        type="button"
        onclick={handleTogglePopover}
        style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:11px;padding:2px 6px;"
        aria-expanded={popoverOpen}
      >Details</button>
      <button
        type="button"
        onclick={handleCollapse}
        style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:11px;padding:2px 6px;"
      >Collapse</button>
    </span>
    {#if popoverOpen && statusData}
      <StatusPopover
        incidents={statusData.incidents}
        onclose={handleClosePopover}
      />
    {/if}
  </div>
{:else if viewState === "strip"}
  <StatusStrip
    {severity}
    onexpand={handleExpand}
  />
{/if}
