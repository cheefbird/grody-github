<script lang="ts">
import { onMount } from "svelte";
import { tokenStorage } from "@/lib/storage";

let hasToken = $state(false);
let loading = $state(true);

onMount(async () => {
  try {
    const token = await tokenStorage.getValue();
    hasToken = !!token;
  } catch (err) {
    console.error("[grody-github] Failed to load token status:", err);
  } finally {
    loading = false;
  }
});

async function openOptions() {
  try {
    await browser.runtime.openOptionsPage();
  } catch (err) {
    console.error("[grody-github] Failed to open options page:", err);
    return;
  }
  window.close();
}
</script>

<main>
  <img src="/icon/128.png" class="logo" alt="Grody GitHub">
  <h1>Grody GitHub</h1>
  {#if !loading}
    {#if hasToken}
      <p class="connected">Token connected</p>
      <p class="hint">
        Stored locally, sent only to GitHub.
        <button type="button" class="link" onclick={openOptions}>
          See options
        </button>
        for details.
      </p>
    {:else}
      <p class="hint">
        Works on public repos without a token.
        <button type="button" class="link" onclick={openOptions}>
          Add a token
        </button>
        to avoid rate limits or use with private repos.
      </p>
    {/if}
  {/if}
  <button type="button" onclick={openOptions}>
    Options
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      style="vertical-align:-1px;margin-left:4px;"
    >
      <path
        d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"
      ></path>
    </svg>
  </button>
</main>

<style>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  min-width: 220px;
  color: light-dark(#1f2328, #e6edf3);
  background: light-dark(#ffffff, #0d1117);
}
.logo {
  width: 64px;
  height: 64px;
}
h1 {
  font-size: 1rem;
  margin: 0.75rem 0 0.5rem;
}
p {
  font-size: 0.8rem;
  color: light-dark(#656d76, #8b949e);
  text-align: center;
  margin: 0 0 1rem;
  line-height: 1.4;
}
.connected {
  color: light-dark(#1a7f37, #3fb950);
  margin-bottom: 0.25rem;
}
.hint {
  font-size: 0.75rem;
}
.link {
  all: unset;
  color: light-dark(#0969da, #58a6ff);
  cursor: pointer;
  font-size: inherit;
}
.link:hover {
  text-decoration: underline;
}
button {
  padding: 0.45rem 1.2rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  background: light-dark(#f6f8fa, #21262d);
  color: light-dark(#1f2328, #e6edf3);
  font-weight: 500;
}
button:hover {
  background: light-dark(#e1e4e8, #30363d);
  border-color: light-dark(#8b949e, #8b949e);
}
</style>
