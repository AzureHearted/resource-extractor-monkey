<template>
	<!-- s 脚本应用容器 -->
	<div
		:data-host="state.host"
		ref="appDOM"
		class="resource-extractor"
		:data-theme="globalStore.theme"
	>
		<div ref="stylesContainer" class="resource-extractor__styles"></div>
		<!-- s 消息通知类信息容器 -->
		<div class="resource-extractor__notification"></div>
		<!-- s 内容区 -->
		<n-config-provider
			v-if="state.isMouted"
			namespace="re-n"
			cls-prefix="re-n"
			inline-theme-disabled
			preflight-style-disabled
			:style-mount-target="stylesContainer"
			:hljs="state.hljs"
			abstract
			:theme="globalStore.theme == 'dark' ? naiveUIdarkTheme : null"
		>
			<n-dialog-provider to=".resource-extractor__notification">
				<n-notification-provider to=".resource-extractor__notification">
					<BaseProvider
						:theme="globalStore.theme === 'dark' ? 'dark' : 'light'"
					>
						<!-- s 布局 -->
						<Layout />
					</BaseProvider>
				</n-notification-provider>
			</n-dialog-provider>
			<!-- s 悬浮按钮 -->
			<FloatButton :show="!globalStore.openWindow" />
			<!-- s 顶层元素的承载容器 -->
			<div
				ref="subWindowContainerDOM"
				class="resource-extractor__modal-container"
			></div>
		</n-config-provider>
	</div>
</template>

<script setup lang="ts">
import { onMounted, reactive, defineAsyncComponent, useTemplateRef } from "vue";
import { BaseProvider } from "base-ui";
import FloatButton from "@/views/float-button.vue";

import {
	darkTheme as naiveUIdarkTheme,
	NDialogProvider,
	NNotificationProvider,
} from "naive-ui";

// 导入仓库
import { useGlobalStore, usePatternStore } from "@/stores";

// 导入高亮语法
import hljs from "highlight.js/lib/core";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);

// 使用仓库
const globalStore = useGlobalStore();
const patternStore = usePatternStore();

const stylesContainer = useTemplateRef("stylesContainer");

// s 状态数据
const state = reactive({
	hljs,
	// 当前站点host
	host: location.host,
	isMouted: false,
});

// 异步导入Layout组件
const Layout = defineAsyncComponent(
	() => import("@/views/layout/layout-index.vue"),
);

onMounted(() => {
	// s 用户配置信息获取
	patternStore.getUserPatternInfo(); // 获取本地方案信息
	patternStore.setInitPattern(); // 获取初始方案
	globalStore.updataTheme(globalStore.galleryState.theme);
	state.isMouted = true;
});
</script>

<style lang="scss" scoped>
dialog {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	border: none;
}

// 布局容器(鼠标可以穿透，只用于划定组件的活动范围，不遮挡其他内容)
.resource-extractor {
	/* 核心属性：阻止滚动溢出到父级 */
	overscroll-behavior: contain;
	box-sizing: border-box;
	position: fixed;
	// position: absolute;
	// overflow: hidden;
	inset: 0;
	// width: 100vw !important;
	// height: 100vh !important;
	max-width: unset !important;
	max-height: unset !important;
	text-align: left;
	padding: unset !important;
	margin: unset !important;
	border: unset !important;
	background: transparent;
	// backdrop-filter: blur(4px);
	// 设置 z-index 为最大值
	z-index: 2147483646;
	// 仅让容器本身不响应鼠标事件
	pointer-events: none;
	// transition: 0.5s;

	& > :deep(*) {
		// 子元素默认还能响应
		pointer-events: auto;
	}

	body,
	div,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6,
	p,
	ul,
	li,
	dd,
	dt {
		color: initial;
	}
}

// ! 子窗口容器样式(主要作为弹窗的容器)
.resource-extractor__modal-container {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	// background: wheat;
	// 仅让容器本身不响应鼠标事件
	pointer-events: none;

	// 子元素默认还能响应
	:deep(*) {
		pointer-events: auto;
	}
}

dialog {
	padding: unset;
}

:deep(input) {
	background: unset;
	box-shadow: unset;
}
</style>

<style lang="scss">
// 导入修复样式
@use "./styles/website/index.scss" as *;
@use "./styles/global.scss" as *;

button i {
	all: unset;
}
button {
	overflow: unset;
}
</style>
