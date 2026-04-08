<script lang="ts">
let {
  expanded = $bindable(true),
  accentColor = "var(--fgColor-muted, #7d8590)",
  children,
  header,
}: {
  expanded: boolean;
  accentColor?: string;
  children: import("svelte").Snippet;
  header: import("svelte").Snippet;
} = $props();

function toggle() {
  expanded = !expanded;
}
</script>

<div
  class="collapsible-card"
  class:collapsed={!expanded}
  style:--accent-color={accentColor}
>
  <button
    type="button"
    class="card-header"
    onclick={toggle}
    aria-expanded={expanded}
  >
    <svg
      class="chevron"
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        fill-rule="evenodd"
        d="M12.78 5.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 6.28a.75.75 0 011.06-1.06L8 8.94l3.72-3.72a.75.75 0 011.06 0z"
      />
    </svg>
    {@render header()}
  </button>
  {#if expanded}
    <div class="card-body">{@render children()}</div>
  {/if}
</div>

<style>
.collapsible-card {
  border: 1px solid var(--borderColor-default, #30363d);
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bgColor-muted, #161b22);
  border-bottom: 2px solid var(--accent-color);
  cursor: pointer;
  user-select: none;
}
.card-header:hover {
  background: var(--bgColor-inset, #1c2129);
}
.card-header:focus-visible {
  outline: 2px solid var(--fgColor-accent, #58a6ff);
  outline-offset: -2px;
}

.collapsed {
  border: none;
}
.collapsed .card-header {
  border: 1px solid var(--borderColor-default, #30363d);
  border-left: 3px solid var(--accent-color);
  border-bottom: 1px solid var(--borderColor-default, #30363d);
  border-radius: 8px;
}

.chevron {
  fill: var(--fgColor-muted, #7d8590);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}
.collapsed .chevron {
  transform: rotate(-90deg);
}

.card-body {
  background: var(--bgColor-default, #010409);
  padding: 8px;
}
</style>
