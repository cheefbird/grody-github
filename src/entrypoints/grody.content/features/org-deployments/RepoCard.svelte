<script lang="ts">
import { type RepoDeployment, STATE_COLORS } from "@/lib/deployment-types";
import RelativeTime from "./RelativeTime.svelte";
import StatusDot from "./StatusDot.svelte";

let { deployment, owner }: { deployment: RepoDeployment; owner: string } =
  $props();

let borderColor = $derived(STATE_COLORS[deployment.state]);
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
