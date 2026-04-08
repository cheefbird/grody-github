<script lang="ts">
let {
  placeholder = "Filter...",
  value = $bindable(""),
}: {
  placeholder?: string;
  value: string;
} = $props();

let inputEl: HTMLInputElement | undefined = $state();

function handleClear() {
  value = "";
  inputEl?.focus();
}
</script>

<div class="subnav-search m-0 width-full">
  <svg
    aria-hidden="true"
    height="16"
    viewBox="0 0 16 16"
    version="1.1"
    width="16"
    class="octicon octicon-search subnav-search-icon"
  >
    <path
      fill-rule="evenodd"
      d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
    />
  </svg>
  <input
    bind:this={inputEl}
    type="search"
    class="form-control subnav-search-input width-full f5"
    {placeholder}
    aria-label={placeholder}
    form=""
    bind:value
  >
  {#if value}
    <button
      type="button"
      class="position-absolute top-0 right-0 mt-2 mr-1 rounded-2 d-block text-center btn-link Link--muted"
      aria-label="Clear filter"
      onclick={handleClear}
    >
      <svg
        aria-hidden="true"
        height="16"
        viewBox="0 0 16 16"
        version="1.1"
        width="16"
        class="octicon octicon-x"
      >
        <path
          fill-rule="evenodd"
          d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"
        />
      </svg>
    </button>
  {/if}
</div>
