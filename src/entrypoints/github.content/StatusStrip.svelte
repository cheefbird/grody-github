<script lang="ts">
  import type { StatusIndicator } from "@/lib/github-status";

  let { severity, onexpand }: {
    severity: StatusIndicator;
    onexpand: () => void;
  } = $props();

  let accentColor = $derived.by(() => {
    if (severity === "critical") return "#da3633";
    if (severity === "major") return "#f0883e";
    return "#d29922";
  });
</script>

<div class="strip" role="status" aria-label="GitHub incident active — click to expand">
  <button type="button" class="pill" onclick={onexpand} aria-label="Expand status banner">
    <span class="dot" style:color={accentColor}>&#9679;</span>
    <span class="pill-text">Incident</span>
    <svg aria-hidden="true" class="chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#484f58" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5L6 7.5L9 4.5"/></svg>
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
    background: #161b22;
    border: 1px solid #30363d;
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
    color: #8b949e;
    font-size: 11px;
  }

  .chevron {
    display: block;
  }
</style>
