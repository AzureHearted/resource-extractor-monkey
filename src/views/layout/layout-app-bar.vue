<template>
	<div class="web-img-collector__app-bar">
		<!-- s 移动端的菜单按钮 -->
		<n-button
			circle
			:bordered="false"
			@click="navCollapse = !navCollapse"
			@mouseenter="!isMobile && (navCollapse = false)"
		>
			<template #icon>
				<icon-ep-menu />
			</template>
		</n-button>
		<!-- ! 侧边导航菜单抽屉 -->
		<n-drawer
			:show="!navCollapse"
			width="fit-content"
			placement="left"
			:trap-focus="false"
			:block-scroll="false"
			display-directive="show"
			@mask-click="navCollapse = true"
			@mouseleave="!isMobile && (navCollapse = true)"
			to=".web-img-collector>.web-img-collector__layout"
		>
			<n-drawer-content
				:body-content-style="{
					padding: '0',
				}"
			>
				<NavMenu @select="navCollapse = true" style="user-select: none" />
			</n-drawer-content>
		</n-drawer>
		<!-- s 标题 -->
		<div class="web-img-collector__app-bar__title">
			<div class="web-img-collector__app-bar__title__left">
				<n-gradient-text type="primary"> Web Img Collector 2 </n-gradient-text>
				<n-tag type="info" size="tiny" round :bordered="false">
					{{ VERSION }}
				</n-tag>
			</div>
			<div class="web-img-collector__app-bar__title__right">
				<!-- s 布局切换按钮 -->
				<n-radio-group
					v-if="currentTab === 'Gallery' || currentTab === 'Favorite'"
					v-model:value="galleryState.galleyLayout"
					size="small"
				>
					<n-radio-button value="grid">
						<n-icon size="26px">
							<icon-prime-th-large />
						</n-icon>
					</n-radio-button>
					<n-radio-button value="waterfall">
						<n-icon size="26px">
							<icon-prime-objects-column />
						</n-icon>
					</n-radio-button>
				</n-radio-group>
			</div>
		</div>
		<!-- s  关闭按钮 -->
		<n-button
			type="error"
			circle
			ghost
			:bordered="false"
			class="web-img-collector__app-bar__close-button"
			@click="globalStore.openWindow = false"
		>
			<template #icon>
				<n-icon size="24px">
					<icon-ant-design-close-circle-filled />
				</n-icon>
			</template>
		</n-button>
	</div>
</template>

<script setup lang="ts">
import { GM_info } from "$";
import { ref, onMounted, onActivated } from "vue";
import { storeToRefs } from "pinia";
import useGlobalStore from "@/stores/GlobalStore"; //导入全局仓库
import NavMenu from "./layout-nav-menu.vue";

import { isMobile as judgeIsMobile } from "@/utils/common";
const globalStore = useGlobalStore();
const { navCollapse, galleryState, tab: currentTab } = storeToRefs(globalStore);
// ? 导入版本号
const VERSION = GM_info.script.version;

const isMobile = ref(false);
onMounted(() => {
	isMobile.value = judgeIsMobile();
});
onActivated(() => {
	isMobile.value = judgeIsMobile();
});
</script>

<style lang="scss" scoped>
@use "@/styles/shadow.scss" as shadow;

.web-img-collector__app-bar {
	display: flex;
	height: 34px;
	line-height: 34px;

	background: white;
	align-items: center;
	box-shadow: shadow.$elevation, inset 0 0 10px rgba(128, 128, 128, 0.6);

	&__title {
		flex: 1;
		height: 100%;
		margin-left: 16px;
		font-size: 20px;
		text-align: left;
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;

		.web-img-collector__app-bar__title__left {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.web-img-collector__app-bar__title__right {
			display: flex;
			align-items: center;
			margin-left: auto;
			padding: 4px 0;

			:deep(.wic2-n-radio-button) {
				padding: 0 8px;
			}
		}
	}
}
</style>
