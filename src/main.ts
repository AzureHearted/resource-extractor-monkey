// 导入全局样式
import "./styles/index.scss";
// 导入 base-ui 样式
import "base-ui/style.css";
import { lowerHighZIndex } from "./styles/fix";

// import "default-passive-events";
import { createApp } from "vue";
import { createPinia } from "pinia";

// 油猴监听器
import { registerBackgroundListener } from "./utils/http/background";

import App from "./App.vue";

// f 初始化函数
function init() {
	lowerHighZIndex();

	// 创建 Vue 应用
	const app = createApp(App);
	// s 使用插件
	app.use(createPinia());

	// 创建 Vue 容器
	const appContainer = document.createElement("div");

	document.documentElement.appendChild(appContainer);

	app.mount(appContainer); // 挂载app

	// app.mount(mountPoint);

	registerBackgroundListener(); // 注册后台监听
}

if (document.readyState !== "loading") {
	init();
} else {
	document.addEventListener("DOMContentLoaded", () => init(), { once: true });
}
