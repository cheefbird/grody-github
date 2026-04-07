<script lang="ts">
import CollapsibleCard from "@/lib/components/CollapsibleCard.svelte";
import type { EnvironmentGroup } from "@/lib/deployment-types";
import RepoCard from "./RepoCard.svelte";

let {
  group,
  owner,
  expanded = $bindable(true),
  accentColor,
}: {
  group: EnvironmentGroup;
  owner: string;
  expanded: boolean;
  accentColor: string;
} = $props();

const failedCount = $derived(
  group.deployments.filter((d) => d.state === "failure" || d.state === "error")
    .length,
);
const inProgressCount = $derived(
  group.deployments.filter((d) => d.state === "in_progress").length,
);
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
</style>
