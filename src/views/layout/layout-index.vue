<template>
	<dialog
		class="layout__container"
		ref="containerDOM"
		:class="{ open: globalStore.openWindow, close: !globalStore.openWindow }">
		<AppBar class="layout__app-bar" />
		<Main class="layout__main" />
	</dialog>
</template>

<script setup lang="ts">
	import { ref, watch, onMounted, nextTick, onUnmounted } from "vue";
	import { useDisableScroll } from "@/utils/disable-scroll";

	import useGlobalStore from "@/stores/GlobalStore"; //导入全局仓库
	const globalStore = useGlobalStore();

	// 导入组件
	import AppBar from "./layout-app-bar.vue";
	import Main from "./layout-main.vue";

	let containerDOM = ref<HTMLDialogElement>();

	onMounted(() => {
		// const { start, stop } = useDisableScroll(document.documentElement);
		// stop();
		watch(
			() => globalStore.openWindow,
			(isOpen) => {
				if (isOpen) {
					// s 页面滚动元素进行滚动
					// start();
					if (!containerDOM.value) return;
					containerDOM.value.show();
					containerDOM.value.focus();
				} else {
					// s 取消页面元素的滚动阻止事件
					// stop();
					if (!containerDOM.value) return;
					containerDOM.value.close();
				}
			},
			{ immediate: true }
		);
		// onUnmounted(() => {
		// 	stop();
		// });
	});
</script>

<style lang="scss" scoped>
	// 布局容器样式
	.layout__container {
		position: absolute;
		// position: fixed;
		// width: 100vw;
		// height: 100vh;
		// width: 100%;
		// height: 100%;
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

		transition: top 0.5s ease-in-out, opacity 0.5s ease-in-out;
		// top: 0;

		// 未打开时的样式
		opacity: 0;
		// top: -100%;
		pointer-events: none;
		// 打开时的样式
		&.open {
			pointer-events: auto;
			// top: 0;
			opacity: 1;
		}
		&.close {
			opacity: 0;
			// top: -100%;
			pointer-events: none;
			:deep(*) {
				pointer-events: none !important;
			}
		}
	}
	// .layout__app-bar {
	// 	flex: 0 0;
	// }
	.layout__main {
		flex: auto; // 设置为auto用于自动占满剩余空间
		overflow: auto; // 设置hidden用于确保内容溢出可以隐藏
		display: flex;
	}
</style>
