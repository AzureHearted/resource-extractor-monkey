<template>
	<div class="re__app-bar" :data-theme="theme">
		<!-- s 菜单按钮 -->
		<n-button
			circle
			:bordered="false"
			@click="navCollapse = !navCollapse"
			@mouseenter="!isMobile && (navCollapse = false)"
		>
			<template #icon>
				<component :is="menuIcon" />
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
			to=".resource-extractor>.resource-extractor__layout"
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
		<div class="re__app-bar__title">
			<div class="re__app-bar__title__left">
				<n-gradient-text type="primary">
					Resource Extractor &nbsp;
				</n-gradient-text>
				<n-tag type="info" size="tiny" round :bordered="false">
					{{ VERSION + (isDevMode ? " (dev)" : "") }}
				</n-tag>
			</div>
			<div class="re__app-bar__title__right">
				<n-radio-group v-model:value="galleryState.theme" size="small">
					<n-radio-button value="auto"> 自动 </n-radio-button>
					<n-radio-button value="light"> 亮色 </n-radio-button>
					<n-radio-button value="dark"> 暗黑 </n-radio-button>
				</n-radio-group>
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
			class="resource-extractor__app-bar__close-button"
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
import { ref, onMounted, onActivated, computed, h } from "vue";
import { storeToRefs } from "pinia";
import { Icon } from "@iconify/vue";
import NavMenu from "./layout-nav-menu.vue";

import { isMobile as judgeIsMobile } from "@/utils";
import { menuConfig } from "./menuConfig";

import { useGlobalStore } from "@/stores"; //导入全局仓库

const globalStore = useGlobalStore();
const {
	navCollapse,
	galleryState,
	tab: currentTab,
	theme,
} = storeToRefs(globalStore);

// 版本号
const VERSION = __APP_VERSION__;

// 是否为开发模式
const isDevMode = import.meta.env.DEV;

const isMobile = ref(false);

onMounted(() => {
	isMobile.value = judgeIsMobile();
});
onActivated(() => {
	isMobile.value = judgeIsMobile();
});

const menuIcon = computed(() => {
	const icon =
		menuConfig.find((m) => m.key === globalStore.tab)?.icon ?? "ep-menu";
	return h(Icon, { icon });
});
</script>

<style scoped lang="scss">
.re__app-bar {
	display: flex;
	height: 34px;
	line-height: 34px;

	background: getTheme(light, background);
	align-items: center;
	box-shadow: getTheme(light, box-shadow);

	&__title {
		flex: 1;
		height: 100%;
		margin-left: 4px;
		font-size: 20px;
		text-align: left;
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;

		&__left {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__right {
			display: flex;
			align-items: center;
			margin-left: auto;
			padding: 4px 4px;

			& > * {
				margin-right: 6px;
			}
			& > *:last-child {
				margin-right: 0px;
			}

			:deep(.re-n-radio-button) {
				padding: 0 8px;
			}
		}
	}
}

.re__app-bar[data-theme="dark"] {
	background: getTheme(dark, background);
	box-shadow: getTheme(dark, box-shadow);
}
</style>
