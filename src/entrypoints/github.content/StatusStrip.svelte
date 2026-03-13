<script lang="ts">
  import type { StatusIndicator } from "@/lib/github-status";

  let { severity, onexpand }: {
    severity: StatusIndicator;
    onexpand: () => void;
  } = $props();

  let color = $derived.by(() => {
    if (severity === "critical") return "#da3633";
    if (severity === "major") return "#f0883e";
    return "#d29922";
  });
</script>

<div role="status" aria-label="GitHub incident active — click to expand">
  <button
    type="button"
    onclick={onexpand}
    style="display:block;width:100%;height:3px;background:{color};border:none;cursor:pointer;padding:0;position:relative;"
    aria-label="Expand status banner"
  >
    <span
      style="position:absolute;right:16px;top:-1px;background:{color};color:white;font-size:9px;padding:1px 6px;border-radius:0 0 4px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
    >&#9660;</span>
  </button>
</div>
