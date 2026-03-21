import "./styles/index.scss";
import { lowerHighZIndex } from "./styles/fix";

import "default-passive-events";
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";

// import router from "./router";

// ? naive-ui组件库配置
import "@/plugin/naive-ui";

// 创建 Vue 容器
const appContainer = document.createElement("div");
// 创建 Vue 应用
const app = createApp(App);

// s 使用插件
app.use(createPinia());
// app.use(router);

// f 初始化函数
function init() {
	lowerHighZIndex();
	document.documentElement.appendChild(appContainer);
	app.mount(appContainer); // 挂载app
}

if (document.readyState !== "loading") {
	init();
} else {
	document.addEventListener("DOMContentLoaded", () => init(), { once: true });
}
