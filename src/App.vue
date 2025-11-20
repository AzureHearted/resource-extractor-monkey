<template>
	<!-- s 脚本应用容器 -->
	<div :data-host="host" ref="appDOM" class="web-img-collector__container">
		<!-- s 消息通知类信息容器 -->
		<el-config-provider namespace="el">
			<div class="web-img-collector__notification-container"></div>
		</el-config-provider>
		<!-- s 内容区 -->
		<el-config-provider namespace="wic2">
			<n-config-provider
				namespace="wic2-n"
				cls-prefix="wic2-n"
				inline-theme-disabled
				preflight-style-disabled
				:hljs="hljs"
				abstract>
				<!-- s 布局 -->
				<Layout />
				<!-- s 悬浮按钮 -->
				<hover-button :show="!globalStore.openWindow" :teleport-to="false" />
				<!-- s 顶层元素的承载容器 -->
				<div
					ref="windowContainer"
					class="web-img-collector__top-container"></div>
			</n-config-provider>
		</el-config-provider>
	</div>
</template>

<script setup lang="ts">
	import {
		ref,
		onMounted,
		onBeforeUnmount,
		onDeactivated,
		onActivated,
		defineAsyncComponent,
		watch,
	} from "vue";
	import useGlobalStore from "@/stores/GlobalStore";
	import usePatternStore from "@/stores/PatternStore";

	import hljs from "highlight.js/lib/core";
	import css from "highlight.js/lib/languages/css";
	import javascript from "highlight.js/lib/languages/javascript";
	hljs.registerLanguage("css", css);
	hljs.registerLanguage("javascript", javascript);

	// 异步导入Layout组件
	const Layout = defineAsyncComponent(
		() => import("@/views/layout/layout-index.vue")
	);

	// 异步导入HoverButton组件
	const HoverButton = defineAsyncComponent(
		() => import("@/views/app-hover-button.vue")
	);

	const globalStore = useGlobalStore();
	const patternStore = usePatternStore();

	// 子窗口容器
	const windowContainer = ref<HTMLElement>();

	// 当前站点host
	const host = ref(location.host);

	onMounted(() => {
		// s 用户配置信息获取
		patternStore.getUserPatternInfo(); // 获取本地方案信息
		patternStore.setInitPattern(); // 获取初始方案
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
		background-color: rgba(0, 0, 0, 0.5); /* 可选：添加背景色 */
	}

	// 布局容器(鼠标可以穿透，只用于划定组件的活动范围，不遮挡其他内容)
	.web-img-collector__container {
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
	.web-img-collector__top-container {
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
	@import "./styles/website/index.scss";

	button i {
		all: unset;
	}
	button {
		overflow: unset;
	}
</style>
