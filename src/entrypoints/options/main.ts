import { mount } from "svelte";
import App from "./App.svelte";

const el = document.getElementById("app");
if (el) mount(App, { target: el });
