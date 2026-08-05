<script lang="ts">
import { onMount } from "svelte";
import { requestEnvironments } from "@/lib/github-api";
import type { Environment, ListResult } from "@/lib/types";

let {
  owner,
  repo,
  container,
}: { owner: string; repo: string; container: HTMLElement } = $props();

let query = $state("");
let environments: Environment[] = $state([]);
let loaded = $state(false);
let hint = $state<string | null>(null);
let inputEl: HTMLInputElement | undefined = $state();

const filtering = $derived(query.trim().length > 0);

const filtered = $derived.by(() => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return environments.filter((env) =>
    terms.every((term) => env.name.toLowerCase().includes(term)),
  );
});

// React owns the nav we hide; the attribute lives on our container so the
// injected stylesheet rule never has to touch React-managed elements.
$effect(() => {
  container.toggleAttribute("data-filtering", filtering);
});

function handleClear() {
  query = "";
  inputEl?.focus();
}

onMount(() => {
  requestEnvironments(owner, repo)
    .then((result: ListResult<Environment>) => {
      if (!result.ok) {
        if (result.reason === "rate-limited") {
          hint = "Rate limited — add a token in extension options";
        } else if (result.reason === "auth-required") {
          hint = "Private repo — add a token in extension options";
        }
        return;
      }
      if (result.items.length === 0) return;
      environments = result.items;
      loaded = true;
    })
    .catch((err) => {
      console.error("[grody-github] Env filter init failed:", err);
    });

  return () => {
    container.removeAttribute("data-filtering");
  };
});
</script>

{#if hint}
  <p class="hint">{hint}</p>
{/if}
{#if loaded}
  <div class="search">
    <svg
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      version="1.1"
      width="16"
      class="search-icon"
    >
      <path
        fill-rule="evenodd"
        d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
      />
    </svg>
    <input
      bind:this={inputEl}
      type="search"
      placeholder="Filter environments..."
      aria-label="Filter environments"
      form=""
      bind:value={query}
    >
    {#if query}
      <button type="button" aria-label="Clear filter" onclick={handleClear}>
        <svg
          aria-hidden="true"
          height="16"
          viewBox="0 0 16 16"
          version="1.1"
          width="16"
        >
          <path
            fill-rule="evenodd"
            d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"
          />
        </svg>
      </button>
    {/if}
  </div>
  {#if filtering}
    <ul class="results">
      {#each filtered as env (env.name)}
        <li>
          <a
            href={`/${owner}/${repo}/deployments/${encodeURIComponent(env.name)}`}
          >
            {env.name}
          </a>
        </li>
      {:else}
        <li class="empty"><em>No environments match your filter.</em></li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
.hint {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  color: var(--fgColor-muted);
}

.search {
  position: relative;
  padding: 8px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  fill: var(--fgColor-muted);
  pointer-events: none;
}

input {
  width: 100%;
  padding: 5px 28px 5px 30px;
  font-size: 14px;
  color: var(--fgColor-default);
  background-color: var(--bgColor-default);
  border: 1px solid var(--borderColor-default);
  border-radius: 6px;
}

input:focus {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -1px;
}

button {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
  fill: var(--fgColor-muted);
}

.results {
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;
}

.results a {
  display: block;
  padding: 6px 8px;
  font-size: 14px;
  color: var(--fgColor-default);
  text-decoration: none;
  border-radius: 6px;
}

.results a:hover {
  background-color: var(--control-transparent-bgColor-hover);
}

.empty {
  padding: 6px 8px;
  font-size: 12px;
  color: var(--fgColor-muted);
}
</style>
