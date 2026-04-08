<script lang="ts">
import type { EnvironmentGroup } from "@/lib/deployment-types";
import CollapsibleCard from "./CollapsibleCard.svelte";
import RepoCard from "./RepoCard.svelte";

let {
  group,
  owner,
  expanded = $bindable(true),
  accentColor,
  pinned = false,
  onTogglePin,
}: {
  group: EnvironmentGroup;
  owner: string;
  expanded: boolean;
  accentColor: string;
  pinned?: boolean;
  onTogglePin?: (envName: string) => void;
} = $props();

const failedCount = $derived(
  group.deployments.filter((d) => d.state === "failure" || d.state === "error")
    .length,
);
const inProgressCount = $derived(
  group.deployments.filter((d) => d.state === "in_progress").length,
);

function handlePinClick(e: Event) {
  e.stopPropagation();
  onTogglePin?.(group.name);
}
</script>

<CollapsibleCard bind:expanded {accentColor}>
  {#snippet header()}
    <span class="env-name f5">{group.name}</span>
    <span class="Counter">{group.deployments.length}</span>
    {#if failedCount > 0}
      <span class="Label Label--danger ml-auto">{failedCount} failed</span>
    {:else if inProgressCount > 0}
      <span class="Label Label--attention ml-auto">deploying</span>
    {:else}
      <span class="Label Label--success ml-auto">all healthy</span>
    {/if}
    <button
      type="button"
      class="pin-btn"
      class:pinned
      onclick={handlePinClick}
      aria-label={pinned ? "Unpin environment" : "Pin environment"}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <title>{pinned ? "Unpin" : "Pin"}</title>
        <path
          d="M4.456.734a1.75 1.75 0 012.826.504l.613 1.327a3.08 3.08 0 002.084 1.707l2.454.584c1.332.317 1.8 1.972.832 2.94L11.06 10l3.72 3.72a.75.75 0 11-1.06 1.06L10 11.06l-2.204 2.205c-.968.968-2.623.5-2.94-.832l-.584-2.454a3.08 3.08 0 00-1.707-2.084l-1.327-.613a1.75 1.75 0 01-.504-2.826z"
        />
      </svg>
    </button>
  {/snippet}
  <div class="repo-grid">
    {#each group.deployments as deployment (deployment.repoName)}
      <RepoCard {deployment} {owner} />
    {/each}
  </div>
</CollapsibleCard>

<style>
.env-name {
  font-weight: 600;
  color: var(--fgColor-default, #e6edf3);
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 6px;
}

.pin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--borderColor-default, #30363d);
  border-radius: 6px;
  background: var(--bgColor-default, #0d1117);
  color: var(--fgColor-muted, #7d8590);
  cursor: pointer;
}
.pin-btn:hover {
  background: var(--bgColor-muted, #161b22);
  border-color: var(--borderColor-muted, #8b949e);
  color: var(--fgColor-default, #e6edf3);
}
.pin-btn.pinned {
  color: var(--fgColor-accent, #58a6ff);
  border-color: var(--fgColor-accent, #58a6ff);
}
.pin-btn.pinned:hover {
  background: var(--bgColor-muted, #161b22);
}
</style>
