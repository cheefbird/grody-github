<script lang="ts">
import type { DeploymentState } from "@/lib/deployment-types";

let { state }: { state: DeploymentState } = $props();

const colorMap: Record<DeploymentState, string> = {
  success: "var(--fgColor-success, #3fb950)",
  failure: "var(--fgColor-danger, #da3633)",
  error: "var(--fgColor-danger, #da3633)",
  in_progress: "var(--fgColor-attention, #d29922)",
  pending: "var(--fgColor-muted, #7d8590)",
  queued: "var(--fgColor-muted, #7d8590)",
  inactive: "var(--fgColor-muted, #7d8590)",
  waiting: "var(--fgColor-attention, #d29922)",
};

const labelMap: Record<DeploymentState, string> = {
  success: "Successful",
  failure: "Failed",
  error: "Error",
  in_progress: "In progress",
  pending: "Pending",
  queued: "Queued",
  inactive: "Inactive",
  waiting: "Waiting for approval",
};
</script>

<span
  class="status-dot"
  style:background={colorMap[state]}
  aria-label={labelMap[state]}
></span>

<style>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
