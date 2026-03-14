<script lang="ts">
import { onMount } from "svelte";
import { componentStatusColor, type StatusIncident } from "@/lib/github-status";

let {
  incidents,
  onclose,
}: {
  incidents: StatusIncident[];
  onclose: () => void;
} = $props();

let popoverEl: HTMLDivElement | undefined = $state();

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeSince(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    onclose();
  }
}

function handleClickOutside(event: MouseEvent) {
  if (popoverEl && !popoverEl.contains(event.target as Node)) {
    onclose();
  }
}

onMount(() => {
  const timer = setTimeout(() => {
    document.addEventListener("click", handleClickOutside);
  }, 0);
  document.addEventListener("keydown", handleKeydown);
  popoverEl?.focus();

  return () => {
    clearTimeout(timer);
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  };
});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="popover" bind:this={popoverEl} tabindex="0">
  {#each incidents as incident, i}
    {#if i > 0}
      <hr class="divider">
    {/if}
    <div class="incident-name">{incident.name}</div>
    <div class="incident-meta">
      {statusLabel(incident.status)}
      &middot; {timeSince(incident.started_at)}
    </div>
    {#each incident.components as component}
      <div class="component-row">
        <span
          class="component-dot"
          style:background={componentStatusColor(component.status)}
        ></span>
        <span>{component.name}</span>
        <span
          class="component-status"
          style:color={componentStatusColor(component.status)}
        >
          {statusLabel(component.status)}
        </span>
      </div>
    {/each}
    <div class="incident-link">
      <a href={incident.shortlink} target="_blank" rel="noopener noreferrer">
        View on githubstatus.com &rarr;
      </a>
    </div>
  {/each}
</div>

<style>
.popover {
  position: absolute;
  top: 100%;
  right: 0;
  max-width: 360px;
  width: 90vw;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 12px 16px;
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  color: #e6edf3;
  margin-top: 4px;
}

.divider {
  border: none;
  border-top: 1px solid #30363d;
  margin: 10px 0;
}

.incident-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.incident-meta {
  color: #8b949e;
  margin-bottom: 8px;
}

.component-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.component-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.component-status {
  margin-left: auto;
}

.incident-link {
  margin-top: 8px;
}

.incident-link a {
  color: #58a6ff;
  text-decoration: none;
  font-size: 11px;
}
</style>
