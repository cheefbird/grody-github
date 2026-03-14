<script lang="ts">
import { onMount } from "svelte";
import {
  componentStatusColor,
  type StatusIncident,
  timeSince,
} from "@/lib/github-status";

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
      &middot;
      {incident.updated_at ? `Updated ${timeSince(incident.updated_at)}` : timeSince(incident.started_at)}
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
  background: var(--bgColor-inset, #161b22);
  border: 1px solid var(--borderColor-default, #30363d);
  border-radius: 8px;
  box-shadow: var(--shadow-floating-large, 0 8px 24px rgba(0, 0, 0, 0.5));
  padding: 12px 16px;
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  color: var(--fgColor-default, #e6edf3);
  margin-top: 4px;
}

.divider {
  border: none;
  border-top: 1px solid var(--borderColor-default, #30363d);
  margin: 10px 0;
}

.incident-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.incident-meta {
  color: var(--fgColor-muted, #8b949e);
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
  color: var(--fgColor-accent, #58a6ff);
  text-decoration: none;
  font-size: 11px;
}
</style>
