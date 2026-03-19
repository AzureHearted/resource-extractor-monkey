<template>
	<dialog
		class="resource-extractor__layout"
		:data-open="globalStore.openWindow"
		ref="containerDOM"
	>
		<AppBar />
		<Main />
	</dialog>
</template>

<script setup lang="ts">
import { watch, onMounted, useTemplateRef } from "vue";

import useGlobalStore from "@/stores/GlobalStore"; //导入全局仓库
const globalStore = useGlobalStore();

// 导入组件
import AppBar from "./layout-app-bar.vue";
import Main from "./layout-main.vue";

let containerDOM = useTemplateRef("containerDOM");

onMounted(() => {
	// console.log(containerDOM.value);
	if (globalStore.openWindow) {
		if (!containerDOM.value) return;
		containerDOM.value.show();
		containerDOM.value.focus();
	} else {
		if (!containerDOM.value) return;
		containerDOM.value.close();
	}
});

watch(
	() => globalStore.openWindow,
	(isOpen) => {
		if (isOpen) {
			if (!containerDOM.value) return;
			containerDOM.value.show();
			containerDOM.value.focus();
		} else {
			if (!containerDOM.value) return;
			containerDOM.value.close();
		}
	},
);
</script>

<style lang="scss" scoped>
// 布局容器样式
.resource-extractor__layout {
	position: absolute;
	inset: 0;
	max-width: unset !important;
	max-height: unset !important;
	padding: unset !important;
	margin: unset !important;
	border: unset !important;
	outline: unset !important;

	display: flex;
	flex-flow: column nowrap;

	overflow: hidden;

	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);

	transition:
		top 0.5s ease-in-out,
		opacity 0.5s ease-in-out;

	// 未打开时的样式
	opacity: 0;
	pointer-events: none;
	// 打开时的样式
	&[data-open="true"] {
		pointer-events: auto;
		opacity: 1;
	}
	&[data-open="false"] {
		opacity: 0;
		pointer-events: none;
		:deep(*) {
			pointer-events: none !important;
		}
	}
}

:deep(.resource-extractor__main) {
	flex: auto; // 设置为auto用于自动占满剩余空间
	overflow: auto; // 设置hidden用于确保内容溢出可以隐藏
	display: flex;
}
</style>
