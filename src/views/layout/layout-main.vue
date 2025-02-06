<template>
	<div class="main__container">
		<n-layout class="main__layout" has-sider>
			<n-layout-sider
				v-if="false"
				style="z-index: 10"
				collapse-mode="width"
				:collapsed-width="isMobile ? 0 : 64"
				width="130"
				:collapsed="collapsed"
				show-trigger
				:trigger-style="{
					transition: '0.5s',
					zIndex: 10000,
					scale: isMobile ? 1.5 : 1,
				}"
				:collapsed-trigger-style="
					isMobile
						? {
								transform: ' translateX(60%) translateY(-50%) ',
								scale: 1.5,
						  }
						: {}
				"
				@collapse="collapsed = true"
				@expand="collapsed = false">
				<NavMenu />
			</n-layout-sider>
			<n-layout class="main__content">
				<keep-alive :include="/gallery|pattern|favorite|setting/i">
					<component :is="nowPage" />
				</keep-alive>
			</n-layout>
		</n-layout>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted } from "vue";
	import type { Component } from "vue";

	import Gallery from "@/views/gallery/gallery-index.vue";
	import PatternEdit from "@/views/pattern-edit/pattern-edit-index.vue";
	import Setting from "@/views/setting/setting-index.vue";
	import Favorite from "@/views/favorite/favorite-index.vue";
	import AutoPage from "@/views/autopage/autopage-index.vue";
	import Test from "@/views/test/test-index.vue";

	import { isMobile as judgeIsMobile } from "@/utils/common";

	import NavMenu from "./layout-nav-menu.vue";

	import { storeToRefs } from "pinia";
	import useGlobalStore from "@/stores/GlobalStore";
	const globalStore = useGlobalStore();
	const { tab: activeKey, navCollapse: collapsed } = storeToRefs(globalStore);

	//s 移动端标识符
	const isMobile = ref(false);
	onMounted(() => {
		isMobile.value = judgeIsMobile();
	});

	// 组件键值对
	const views: { [key: string]: Component } = {
		Gallery,
		PatternEdit,
		Favorite,
		AutoPage,
		Setting,
		Test,
	};
	// 动态组件
	const nowPage = computed(() => {
		return views[activeKey.value];
	});
</script>

<style lang="scss" scoped>
	.main__container {
		position: relative;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		// padding: 4px;
		// background: orange;
		overflow: hidden;
		display: flex;
		// gap: 4px;
	}

	:deep(.wic2-n-layout) {
		background: unset;

		.wic2-n-layout-sider {
			background: rgba(255, 255, 255, 0.3);
			backdrop-filter: blur(10px);
		}
		.wic2-n-card {
			background: unset;
		}
	}
</style>
