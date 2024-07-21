import "./styles/index.scss";
import { lowerHighZIndex } from "./styles/fix";

import "default-passive-events";
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";

// import router from "./router";

// Varlet组件库(配置)
// import "@/plugin/varlet";

//naive-ui组件库(相关)
import "@/plugin/naive-ui";

// 创建 Vue 容器
const fragment = document.createDocumentFragment();
const appContainer = document.createElement("div");
fragment.appendChild(appContainer);
// 创建 Vue 应用
const app = createApp(App);

app.use(createPinia());
// app.use(router);

function init() {
	lowerHighZIndex();
	app.mount(appContainer); // 挂载app
	// document.documentElement.appendChild(appContainer);
	document.documentElement.appendChild(fragment);
}

if (document.readyState !== "loading") {
	init();
} else {
	document.addEventListener("DOMContentLoaded", () => init(), { once: true });
}
