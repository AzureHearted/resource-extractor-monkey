<template>
	<div class="setting__container">
		<Tabs
			:show-buttons="false"
			style="height: 100%"
			content-style="overflow: hidden;"
		>
			<TabPane name="setting" label="全局设置">
				<GlobalSetting />
			</TabPane>
			<TabPane name="style-sheet-manager" label="页面样式管理">
				<StyleSheetManage />
			</TabPane>
		</Tabs>
	</div>
</template>

<script setup lang="ts">
import { BaseTabs as Tabs, BaseTabPane as TabPane } from "base-ui";
import GlobalSetting from "@/views/setting/global-setting.vue";
import StyleSheetManage from "@/views/setting/style-sheet-manager.vue";
</script>

<style lang="scss" scoped>
.setting__container {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	padding: 4px;
	display: flex;
	flex-flow: column;
}

:deep(.base-tabs__container) {
	.base-tabs__tab-item {
		font-size: 16px;
		padding: 0 12px;
		height: 30px;
		line-height: 30px;
	}

	.base-tabs__content {
		overflow: hidden;
	}
}
</style>
