<script lang="ts">
import { onMount } from "svelte";
import SearchFilter from "@/lib/components/SearchFilter.svelte";
import { requestOrgDeployments } from "@/lib/deployment-api";
import type { EnvironmentGroup } from "@/lib/deployment-types";
import DeploymentCard from "./DeploymentCard.svelte";
import { getEnvColor, shouldExpandByDefault } from "./utils";

let { org }: { org: string } = $props();

let groups: EnvironmentGroup[] = $state([]);
let loaded = $state(false);
let hint = $state<string | null>(null);
let cacheTimestamp = $state<number>(Date.now());
let query = $state("");
let debouncedQuery = $state("");
let expandedState = $state<Record<string, boolean>>({});

$effect(() => {
  const current = query;
  const timeout = setTimeout(() => {
    debouncedQuery = current;
  }, 150);
  return () => clearTimeout(timeout);
});

function initExpandedState(envGroups: EnvironmentGroup[]) {
  const state: Record<string, boolean> = {};
  for (const group of envGroups) {
    state[group.name] = shouldExpandByDefault(group.name);
  }
  expandedState = state;
}

const filteredGroups = $derived.by(() => {
  if (!debouncedQuery.trim()) return groups;
  const term = debouncedQuery.trim().toLowerCase();
  return groups
    .map((group) => {
      if (group.name.toLowerCase().includes(term)) return group;
      const filtered = group.deployments.filter((d) =>
        d.repoName.toLowerCase().includes(term),
      );
      if (filtered.length === 0) return null;
      return { ...group, deployments: filtered };
    })
    .filter((g): g is EnvironmentGroup => g !== null);
});

const totalRepos = $derived(
  new Set(groups.flatMap((g) => g.deployments.map((d) => d.repoName))).size,
);

let envColorMap = $state<Record<string, string>>({});

function initColorMap(envGroups: EnvironmentGroup[]) {
  const map: Record<string, string> = {};
  for (let i = 0; i < envGroups.length; i++) {
    map[envGroups[i].name] = getEnvColor(i);
  }
  envColorMap = map;
}

let now = $state(Date.now());

$effect(() => {
  const id = setInterval(() => {
    now = Date.now();
  }, 30_000);
  return () => clearInterval(id);
});

function formatCacheAge(timestamp: number, currentTime: number): string {
  const diff = Math.floor((currentTime - timestamp) / 1000);
  if (diff < 60) return "just now";
  const minutes = Math.floor(diff / 60);
  return `${minutes}m ago`;
}

let cacheAgeLabel = $derived(formatCacheAge(cacheTimestamp, now));

onMount(() => {
  requestOrgDeployments(org)
    .then((result) => {
      if (!result.ok) {
        if (result.reason === "rate-limited") {
          hint = "Rate limited — add a token in extension options";
        } else if (result.reason === "auth-required") {
          hint =
            "Token required — add a GitHub PAT with deployment read access in extension options";
        } else {
          hint = "Failed to load deployments";
        }
        return;
      }
      groups = result.groups;
      cacheTimestamp = result.timestamp;
      loaded = true;
      initExpandedState(result.groups);
      initColorMap(result.groups);
    })
    .catch(() => {
      hint = "Failed to load deployments";
    });
});
</script>

<div class="deployments-header">
  <div>
    <h2 class="f3">{org}</h2>
    {#if loaded}
      <p class="color-fg-muted f6">
        {totalRepos}
        repos across {groups.length} environments
      </p>
    {/if}
  </div>
  {#if loaded}
    <div class="header-actions">
      <SearchFilter placeholder="Filter repos..." bind:value={query} />
      <span class="Label color-fg-muted f6"> Updated {cacheAgeLabel} </span>
    </div>
  {/if}
</div>

{#if !loaded && !hint}
  <p class="color-fg-muted f5 text-center py-4">Loading deployments...</p>
{/if}

{#if hint}
  <div class="flash flash-warning mt-3">
    <p>{hint}</p>
  </div>
{/if}

{#if loaded}
  <div class="env-stack mt-3">
    {#each filteredGroups as group, i (group.name)}
      <DeploymentCard
        {group}
        owner={org}
        bind:expanded={expandedState[group.name]}
        accentColor={envColorMap[group.name]}
      />
    {/each}
    {#if filteredGroups.length === 0 && query}
      <p class="color-fg-muted f5 text-center py-4">
        No environments or repos match "{query}"
      </p>
    {/if}
  </div>
{/if}

<style>
.deployments-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--borderColor-default, #21262d);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.env-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
