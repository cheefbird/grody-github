<script lang="ts">
import RelativeTime from "@/lib/components/RelativeTime.svelte";
import StatusDot from "@/lib/components/StatusDot.svelte";
import type { RepoDeployment } from "@/lib/deployment-types";

let { deployment, owner }: { deployment: RepoDeployment; owner: string } =
  $props();

const borderColorMap: Record<string, string> = {
  success: "var(--fgColor-success, #3fb950)",
  failure: "var(--fgColor-danger, #da3633)",
  error: "var(--fgColor-danger, #da3633)",
  in_progress: "var(--fgColor-attention, #d29922)",
};

let borderColor = $derived(
  borderColorMap[deployment.state] ?? "var(--fgColor-muted, #7d8590)",
);
</script>

<a
  class="repo-card"
  style:border-left-color={borderColor}
  href="/{owner}/{deployment.repoName}/deployments"
>
  <div class="repo-name">
    <StatusDot state={deployment.state} />
    <span>{deployment.repoName}</span>
  </div>
  <div class="repo-meta">
    <span class="ref">{deployment.ref}</span>
    {#if deployment.state === "in_progress"}
      <span>deploying...</span>
    {:else}
      <RelativeTime datetime={deployment.createdAt} />
    {/if}
    {#if deployment.creator !== "unknown"}
      <span>@{deployment.creator}</span>
    {/if}
  </div>
</a>

<style>
.repo-card {
  display: block;
  background: var(--bgColor-muted, #161b22);
  border-radius: 6px;
  padding: 10px 12px;
  border-left: 3px solid;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.repo-card:hover {
  background: var(--bgColor-inset, #1c2129);
}

.repo-name {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--fgColor-default, #e6edf3);
}

.repo-meta {
  color: var(--fgColor-muted, #7d8590);
  font-size: 11px;
  margin-top: 4px;
  padding-left: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ref {
  color: var(--fgColor-accent, #58a6ff);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", monospace;
  font-size: 11px;
}
</style>
