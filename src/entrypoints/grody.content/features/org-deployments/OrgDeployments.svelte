<script lang="ts">
import { onMount } from "svelte";
import SearchFilter from "@/lib/components/SearchFilter.svelte";
import { requestOrgDeployments } from "@/lib/deployment-api";
import type { EnvironmentGroup } from "@/lib/deployment-types";
import { getPinnedEnvironments, setPinnedEnvironments } from "@/lib/storage";
import DeploymentCard from "./DeploymentCard.svelte";
import { autoDetectPins, getEnvColor, shouldExpandByDefault } from "./utils";

let { org }: { org: string } = $props();

let groups: EnvironmentGroup[] = $state([]);
let loaded = $state(false);
let hint = $state<string | null>(null);
let cacheTimestamp = $state<number>(Date.now());
let query = $state("");
let debouncedQuery = $state("");
let expandedState = $state<Record<string, boolean>>({});
let pinnedNames = $state<string[]>([]);
let showAll = $state(false);
let refreshing = $state(false);

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

async function initPins(envGroups: EnvironmentGroup[]) {
  try {
    const stored = await getPinnedEnvironments(org);
    if (stored) {
      pinnedNames = stored;
      return;
    }
  } catch (err) {
    console.warn("[grody-github] Failed to read pinned envs:", err);
  }
  const detected = autoDetectPins(envGroups.map((g) => g.name));
  pinnedNames = detected;
  try {
    await setPinnedEnvironments(org, detected);
  } catch (err) {
    console.warn("[grody-github] Failed to save pinned envs:", err);
  }
}

async function handleTogglePin(envName: string) {
  const previous = pinnedNames;
  const isPinned = pinnedNames.includes(envName);
  const updated = isPinned
    ? pinnedNames.filter((n) => n !== envName)
    : [...pinnedNames, envName];
  pinnedNames = updated;
  try {
    await setPinnedEnvironments(org, updated);
  } catch (err) {
    console.warn("[grody-github] Failed to persist pin change:", err);
    pinnedNames = previous;
  }
}

async function handleRefresh() {
  refreshing = true;
  try {
    const result = await requestOrgDeployments(org, true);
    if (result.ok) {
      groups = result.groups;
      cacheTimestamp = result.timestamp;
      initColorMap(result.groups);
      hint = null;
    } else {
      hint =
        result.reason === "rate-limited"
          ? "Rate limited — try again later"
          : "Refresh failed";
    }
  } catch (err) {
    console.error("[grody-github] Refresh failed:", err);
    hint = "Refresh failed — extension may need to be reloaded";
  } finally {
    refreshing = false;
  }
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

const isSearching = $derived(debouncedQuery.trim().length > 0);
const pinnedSet = $derived(new Set(pinnedNames));

const pinnedGroups = $derived(
  filteredGroups.filter((g) => pinnedSet.has(g.name)),
);
const unpinnedGroups = $derived(
  filteredGroups.filter((g) => !pinnedSet.has(g.name)),
);

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
    .then(async (result) => {
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
      await initPins(result.groups);
    })
    .catch((err) => {
      console.error("[grody-github] Deployment load failed:", err);
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
      <SearchFilter placeholder="Filter envs or repos..." bind:value={query} />
      <button
        type="button"
        class="refresh-btn"
        onclick={handleRefresh}
        disabled={refreshing}
      >
        <svg
          class="refresh-icon"
          class:spinning={refreshing}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <title>Refresh</title>
          <path
            d="M1.705 8.005a.75.75 0 01.834.656 5.5 5.5 0 009.592 2.97l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.002 7.002 0 011.05 8.84a.75.75 0 01.656-.834zM8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.002 7.002 0 0114.95 7.16a.75.75 0 11-1.49.178A5.5 5.5 0 008 2.5z"
          />
        </svg>
        Updated {cacheAgeLabel}
      </button>
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
    {#if isSearching}
      {#each filteredGroups as group (group.name)}
        <DeploymentCard
          {group}
          owner={org}
          bind:expanded={expandedState[group.name]}
          accentColor={envColorMap[group.name]}
          pinned={pinnedSet.has(group.name)}
          onTogglePin={handleTogglePin}
        />
      {/each}
    {:else}
      {#each pinnedGroups as group (group.name)}
        <DeploymentCard
          {group}
          owner={org}
          bind:expanded={expandedState[group.name]}
          accentColor={envColorMap[group.name]}
          pinned={true}
          onTogglePin={handleTogglePin}
        />
      {/each}
      {#if unpinnedGroups.length > 0}
        {#if showAll}
          {#each unpinnedGroups as group (group.name)}
            <DeploymentCard
              {group}
              owner={org}
              bind:expanded={expandedState[group.name]}
              accentColor={envColorMap[group.name]}
              pinned={false}
              onTogglePin={handleTogglePin}
            />
          {/each}
        {/if}
        <button
          type="button"
          class="show-all-toggle"
          onclick={() => { showAll = !showAll; }}
        >
          {showAll
            ? `Hide ${unpinnedGroups.length} environments`
            : `Show ${unpinnedGroups.length} more environments`}
        </button>
      {/if}
    {/if}
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

.show-all-toggle {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  text-align: center;
  padding: 10px;
  border: 1px dashed var(--borderColor-default, #30363d);
  border-radius: 8px;
  color: var(--fgColor-accent, #58a6ff);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.show-all-toggle:hover {
  background: var(--bgColor-muted, #161b22);
}

.refresh-btn {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 32px;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: var(--fgColor-default, #f0f6fc);
  background: var(--bgColor-muted, #262c36);
  border: 1px solid var(--borderColor-default, #b7bdc8);
  border-radius: 6px;
  white-space: nowrap;
  transition: background 0.15s;
}
.refresh-btn:hover {
  background: var(--bgColor-inset, #1c2129);
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
}
</style>
