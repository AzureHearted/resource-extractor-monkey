<template>
	<BaseScrollbar
		show-back-top-button
		back-to-top-behavior="smooth"
		show-arrived-indicator
		:viewport-style="{ padding: `16px` }"
	>
		<n-card class="re-global-setting" size="small" :data-theme="theme">
			<n-form
				class="re-global-setting__form"
				:show-feedback="false"
				label-placement="left"
			>
				<n-form-item label="主题：">
					<n-radio-group v-model:value="galleryState.theme" size="small">
						<n-popover trigger="hover">
							<template #trigger>
								<n-radio-button value="auto"> 自动 </n-radio-button>
							</template>
							跟随系统
						</n-popover>
						<n-radio-button value="light"> 亮色 </n-radio-button>
						<n-radio-button value="dark"> 暗黑 </n-radio-button>
					</n-radio-group>
				</n-form-item>
				<n-form-item label="布局：">
					<n-radio-group v-model:value="galleryState.galleyLayout" size="small">
						<n-radio-button value="grid" title="网格布局">
							<n-icon
								:size="16"
								style="display: flex; align-items: center; height: 100%"
							>
								<icon-prime-th-large />
							</n-icon>
						</n-radio-button>
						<n-radio-button value="waterfall" title="瀑布流布局">
							<n-icon
								:size="16"
								style="display: flex; align-items: center; height: 100%"
							>
								<icon-prime-objects-column />
							</n-icon>
						</n-radio-button>
					</n-radio-group>
				</n-form-item>
				<n-form-item label="缩略图：">
					<n-popover trigger="hover" placement="right">
						<template #trigger>
							<n-checkbox v-model:checked="galleryState.allowImgCreateThumb">
								允许自动生成缩略图
							</n-checkbox>
						</template>
						若出现页面卡顿请关闭该选项
					</n-popover>
				</n-form-item>
				<n-form-item label="过渡动画：">
					<n-popover trigger="hover" placement="right">
						<template #trigger>
							<n-checkbox v-model:checked="galleryState.allowTransition">
								允许过渡动画
							</n-checkbox>
						</template>
						开启后画廊的每个卡片在发生位置变化时会进行过渡
						(若出现页面卡顿请关闭该选项)
					</n-popover>
				</n-form-item>
				<n-form-item label="资源加载：">
					<n-popover trigger="hover" placement="right">
						<template #trigger>
							<n-checkbox v-model:checked="galleryState.pageLoadedGetResource">
								页面加载后获取资源
							</n-checkbox>
						</template>
						页面加载后使用匹配的方案（如果没有，则使用默认方案）获取页面资源
						(若出现页面卡顿请关闭该选项)
					</n-popover>
				</n-form-item>
			</n-form>
		</n-card>
	</BaseScrollbar>
</template>

<script setup lang="ts">
import { BaseScrollbar } from "base-ui";
import { useGlobalStore } from "@/stores";
import { storeToRefs } from "pinia";
const globalStore = useGlobalStore();
const { galleryState, theme } = storeToRefs(globalStore);
</script>

<style lang="scss" scoped>
.re-global-setting {
	font-size: 16px;
	// padding: 8px 16px;
	border-radius: 8px;
	border: 1px solid rgba(getTheme(light, color), 0.5);
	background-color: rgba(getTheme(light, background), 0.5);

	// &__form {
	// }

	&[data-theme="dark"] {
		border: 1px solid rgba(getTheme(dark, color), 0.5);
		background-color: rgba(getTheme(dark, background), 0.5);
	}
}

:deep(.re-n-radio__label) {
	height: 100%;
}
</style>
