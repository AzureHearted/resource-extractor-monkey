<template>
	<!-- s 悬浮按钮 -->
	<BaseFloatButton
		:init-position="{ bottom: 100, right: 40 }"
		:safe-boundary="{ left: 16, top: 16, right: 16, bottom: 16 }"
		:style="{
			'z-index': '-1',
		}"
		@main-button-dblclick="toggleWindow()"
	>
		<template #default>
			<n-badge
				:value="cardStoreData.cardList.length"
				:max="999"
				type="info"
				style="user-select: none"
			>
				<div
					style="
						overflow: hidden;
						width: 100%;
						height: 100%;
						border-radius: 50%;
					"
					v-ripple
				>
					<icon-mdi-dots-grid style="width: 100%; height: 100%; scale: 0.9" />
				</div>
			</n-badge>
		</template>
		<template #extra>
			<!-- s 测试窗口 -->
			<div
				style="overflow: hidden; border-radius: 50%"
				v-ripple
				@click="toggleWindow('Test')"
			>
				<icon-material-symbols-experiment-outline
					style="width: 100%; height: 100%; scale: 0.75"
				/>
			</div>
			<!-- s 设置 -->
			<div
				style="overflow: hidden; border-radius: 50%"
				v-ripple
				@click="toggleWindow('Setting')"
			>
				<icon-ant-design-setting-twotone
					style="width: 100%; height: 100%; scale: 0.75"
				/>
			</div>
			<!-- s 收藏 -->

			<n-badge
				:value="favoriteStore.data.cardList.length"
				:processing="loading"
				:max="999"
				type="info"
				style="user-select: none; width: 100%; height: 100%"
			>
				<div
					style="
						overflow: hidden;
						width: 100%;
						height: 100%;
						border-radius: 50%;
					"
					v-ripple
					@click="toggleWindow('Favorite')"
				>
					<icon-mdi-favorite style="width: 100%; height: 100%; scale: 0.75" />
				</div>
			</n-badge>
			<!-- s 方案管理 -->
			<div
				style="overflow: hidden; border-radius: 50%"
				v-ripple
				@click="toggleWindow('PatternEdit')"
			>
				<icon-material-symbols-box-edit
					style="width: 100%; height: 100%; scale: 0.75"
				/>
			</div>
			<!-- s 图库 -->
			<n-badge
				:value="cardStoreData.cardList.length"
				:processing="loading"
				:max="999"
				type="info"
				style="user-select: none; width: 100%; height: 100%"
			>
				<div
					style="
						overflow: hidden;
						width: 100%;
						height: 100%;
						border-radius: 50%;
					"
					v-ripple
					@click="toggleWindow('Gallery')"
				>
					<icon-material-symbols-team-dashboard
						style="width: 100%; height: 100%; scale: 0.75"
					/>
				</div>
			</n-badge>
		</template>
	</BaseFloatButton>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from "vue";

import { BaseFloatButton, vRipple } from "base-ui";

import { isMobile as judgeIsMobile } from "@/utils";
import { storeToRefs } from "pinia";
import {
	useCardStore,
	useGlobalStore,
	useLoadingStore,
	useFavoriteStore,
} from "@/stores";

const globalStore = useGlobalStore();
const { openWindow, tab } = storeToRefs(globalStore);

const cardStore = useCardStore();
const { data: cardStoreData } = storeToRefs(cardStore);

const favoriteStore = useFavoriteStore();
// const { cardList: favoriteCardList } = storeToRefs(favoriteStore);

const loadingStore = useLoadingStore();
const { loading } = storeToRefs(loadingStore);

const active = ref(false); // s 控制悬浮按钮的显示状态

// 定义Props
withDefaults(
	defineProps<{
		teleportTo?: string | HTMLElement | false; // 指定浮动按钮的挂载点
		show?: boolean;
	}>(),
	{
		teleportTo: () => "body",
		show: true,
	},
);

const isMobile = ref(false);

onMounted(() => {
	isMobile.value = judgeIsMobile();
});

onActivated(() => {
	isMobile.value = judgeIsMobile();
});

// f 切换窗口显示
function toggleWindow(name?: typeof tab.value) {
	active.value = false;
	if (name) {
		tab.value = name;
		openWindow.value = true;
	} else {
		openWindow.value = !openWindow.value;
	}
}
</script>

<style lang="scss" scoped></style>
