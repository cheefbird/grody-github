<script lang="ts">
import { onMount } from "svelte";
import { requestWorkflows } from "@/lib/github-api";
import type { Workflow, WorkflowResult } from "@/lib/types";

let {
  owner,
  repo,
  navList,
}: { owner: string; repo: string; navList: HTMLElement } = $props();

let query = $state("");
let workflows: Workflow[] = $state([]);
let loaded = $state(false);
let hint = $state<string | null>(null);
let inputEl: HTMLInputElement | undefined = $state();

// Internal DOM references (non-reactive, not used in template)
let workflowsSection: HTMLElement | null = null;
let innerUl: HTMLElement | null = null;
let showMoreContainer: HTMLElement | null = null;
let originalChildren: Node[] = [];

// Static SVG strings, safe for {@html} — no user input involved
const searchIconSvg = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-search subnav-search-icon"><path fill-rule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"></path></svg>`;

const xIconSvg = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-x"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path></svg>`;

function findDomElements(): boolean {
  const allWorkflowsItem = navList.querySelector(":scope > li.ActionListItem");
  workflowsSection = navList.querySelector(":scope > li:has(nav-list-group)");
  if (!allWorkflowsItem || !workflowsSection) return false;

  innerUl = workflowsSection.querySelector("ul");
  showMoreContainer = workflowsSection.querySelector(
    '[data-action*="nav-list-group#showMore"]',
  );
  if (!innerUl || !showMoreContainer) return false;

  return true;
}

function cloneOriginalChildren() {
  if (!innerUl) return;
  originalChildren = [...innerUl.children].map((child) =>
    child.cloneNode(true),
  );
}

function restoreOriginal() {
  if (!innerUl) return;
  innerUl.replaceChildren(
    ...originalChildren.map((child) => child.cloneNode(true)),
  );
}

function buildWorkflowHref(workflow: Workflow): string {
  const filename = workflow.path.split("/").pop() ?? "";
  return `/${owner}/${repo}/actions/workflows/${filename}`;
}

function filterWorkflows(searchQuery: string) {
  if (!innerUl) return;

  if (!searchQuery.trim()) {
    restoreOriginal();
    return;
  }

  const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = workflows.filter((workflow) => {
    const filename = workflow.path.split("/").pop() ?? "";
    return terms.every((term) =>
      `${workflow.name} ${filename}`.toLowerCase().includes(term),
    );
  });

  if (matches.length > 0) {
    const elements = matches.map((workflow) => {
      const li = document.createElement("li");
      li.className = "ActionListItem";
      const a = document.createElement("a");
      a.className = "ActionListContent";
      a.setAttribute("data-turbo-frame", "repo-content-turbo-frame");
      a.href = buildWorkflowHref(workflow);
      const span = document.createElement("span");
      span.className = "ActionListItem-label ActionListItem-label--truncate";
      span.textContent = workflow.name;
      a.appendChild(span);
      li.appendChild(a);
      return li;
    });
    innerUl.replaceChildren(...elements);
  } else {
    const li = document.createElement("li");
    li.className = "py-2 px-3";
    const em = document.createElement("em");
    em.className = "color-fg-muted";
    em.textContent = "No workflows match your filter.";
    li.appendChild(em);
    innerUl.replaceChildren(li);
  }
}

function handleClear() {
  query = "";
  inputEl?.focus();
}

// Debounced filter via $effect — re-runs and auto-cancels on query change
$effect(() => {
  const currentQuery = query;
  const timeout = setTimeout(() => filterWorkflows(currentQuery), 150);
  return () => clearTimeout(timeout);
});

// Setup + teardown consolidated in onMount
onMount(() => {
  if (!findDomElements()) return;
  cloneOriginalChildren();

  // Async work via .then() — onMount cleanup requires synchronous callback
  requestWorkflows(owner, repo)
    .then((result: WorkflowResult) => {
      if (!result.ok) {
        if (result.reason === "rate-limited") {
          hint = "Rate limited — add a token in extension options";
        } else if (result.reason === "auth-required") {
          hint = "Private repo — add a token in extension options";
        }
        return;
      }
      if (result.workflows.length === 0) return;
      workflows = result.workflows;
      loaded = true;
      if (showMoreContainer) {
        showMoreContainer.hidden = true;
      }
    })
    .catch((err) => {
      console.error("[grody-github] Workflow filter init failed:", err);
    });

  return () => {
    if (showMoreContainer) {
      showMoreContainer.hidden = false;
    }
    restoreOriginal();
  };
});
</script>

{#if hint}
  <li class="px-3 py-2">
    <em class="color-fg-muted f6">{hint}</em>
  </li>
{/if}
{#if loaded}
  <li class="p-2">
    <div class="subnav-search m-0 width-full">
      {@html searchIconSvg}
      <input
        bind:this={inputEl}
        type="search"
        class="form-control subnav-search-input width-full f5"
        placeholder="Filter workflows..."
        aria-label="Filter workflows"
        form=""
        bind:value={query}
      />
      {#if query}
        <button
          type="button"
          class="position-absolute top-0 right-0 mt-2 mr-1 rounded-2 d-block text-center btn-link Link--muted"
          aria-label="Clear filter"
          onclick={handleClear}
        >
          {@html xIconSvg}
        </button>
      {/if}
    </div>
  </li>
{/if}
