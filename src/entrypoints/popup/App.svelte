<script lang="ts">
  import { onMount } from "svelte";
  import { tokenStorage } from "../../lib/storage";

  let hasToken = $state(false);
  let loading = $state(true);

  onMount(async () => {
    const token = await tokenStorage.getValue();
    hasToken = !!token;
    loading = false;
  });

  function openOptions() {
    browser.runtime.openOptionsPage();
    window.close();
  }
</script>

<main>
  <img src="/icon/128.png" class="logo" alt="Grody GitHub" />
  <h1>Grody GitHub</h1>
  {#if !loading}
    {#if hasToken}
      <p class="connected">Connected</p>
    {:else}
      <p>Add your GitHub token to enable workflow filtering.</p>
    {/if}
  {/if}
  <button onclick={openOptions}>Options</button>
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
