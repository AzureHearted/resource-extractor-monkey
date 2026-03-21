<template>
	<Scrollbar
		show-back-top-button
		back-to-top-behavior="smooth"
		show-arrived-indicator
		:viewport-style="{ padding: `16px` }"
	>
		<div class="global-setting__container">
			<n-popover trigger="hover">
				<template #trigger>
					<n-checkbox v-model:checked="galleryState.allowImgCreateThumb">
						允许自动生成缩略图
					</n-checkbox>
				</template>
				若出现页面卡顿请关闭该选项
			</n-popover>

			<n-popover trigger="hover">
				<template #trigger>
					<n-checkbox v-model:checked="galleryState.allowTransition">
						允许过渡动画
					</n-checkbox>
				</template>
				开启后画廊的每个卡片在发生位置变化时会进行过渡
				(若出现页面卡顿请关闭该选项)
			</n-popover>

			<n-popover trigger="hover">
				<template #trigger>
					<n-checkbox v-model:checked="galleryState.pageLoadedGetResource">
						页面加载后获取资源
					</n-checkbox>
				</template>
				页面加载后使用匹配的方案（如果没有，则使用默认方案）获取页面资源
				(若出现页面卡顿请关闭该选项)
			</n-popover>
		</div>
	</Scrollbar>
</template>

<script setup lang="ts">
import Scrollbar from "@/components/base/base-scrollbar.vue";
import { useGlobalStore } from "@/stores";
import { storeToRefs } from "pinia";
const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);
</script>

<style lang="scss" scoped>
.global-setting__container {
	font-size: 16px;
	padding: 8px;
	border-radius: 8px;
	border: 1px solid wheat;
	background-color: rgba(200, 200, 200, 0.6);
}
</style>
