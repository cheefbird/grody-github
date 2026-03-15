<script lang="ts">
import {
  indicatorColor,
  RESOLVED_COLOR,
  type StatusIndicator,
} from "@/lib/github-status";

let {
  severity,
  resolved = false,
  onexpand,
}: {
  severity: StatusIndicator;
  resolved?: boolean;
  onexpand: () => void;
} = $props();

let accentColor = $derived(
  resolved ? RESOLVED_COLOR : indicatorColor(severity),
);
</script>

<div
  class="strip"
  role="status"
  aria-label={resolved ? "GitHub incident resolved — click to expand" : "GitHub incident active — click to expand"}
>
  <button
    type="button"
    class="pill"
    onclick={onexpand}
    aria-label="Expand status banner"
  >
    <span class="dot" style:color={accentColor}>&#9679;</span>
    <span class="pill-text">{resolved ? "Resolved" : "Incident"}</span>
    <svg
      aria-hidden="true"
      class="chevron"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  </button>
</div>

<style>
.strip {
  display: flex;
  justify-content: center;
  padding: 0 0 6px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bgColor-inset, #161b22);
  border: 1px solid var(--borderColor-default, #30363d);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 3px 10px;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.dot {
  font-size: 11px;
  line-height: 1;
}

.pill-text {
  color: var(--fgColor-muted, #8b949e);
  font-size: 11px;
}

.chevron {
  display: block;
  color: var(--fgColor-muted, #8b949e);
}
</style>
