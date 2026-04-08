<script lang="ts">
import type { DeploymentState } from "@/lib/deployment-types";
import { STATE_COLORS } from "./utils";

let { state }: { state: DeploymentState } = $props();

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
  style:background={STATE_COLORS[state]}
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
