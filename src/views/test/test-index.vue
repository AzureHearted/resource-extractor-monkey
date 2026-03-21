<template>
	<n-flex class="test__container" vertical :size="4">
		<!-- s 单行溢出列表测试 -->
		<n-flex :size="4">
			<n-switch v-model:value="show" @update:value="show = $event" />
			<n-button type="primary" @click="showBtn = !showBtn">增加按钮</n-button>
		</n-flex>

		<TestLineOverflowList />
		<!-- s Tabs组件测试 -->
		<TestTabs />
		<BaseDock v-model:show="show">
			<n-flex
				v-if="showBtn"
				:size="4"
				:wrap="false"
				style="box-sizing: border-box"
			>
				<n-button type="primary" size="medium">按钮1</n-button>
				<n-button type="primary" size="medium">按钮1</n-button>
				<n-button type="primary" size="medium">按钮1</n-button>
			</n-flex>
			<!-- <n-button type="primary" size="medium">测试</n-button> -->
		</BaseDock>
	</n-flex>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TestLineOverflowList from "./test-line-overflow-list.vue";
import TestTabs from "./test-tabs.vue";
import BaseDock from "@/components/base/base-dock.vue";
// onActivated(() => {
// 	console.log("激活", show.value);
// });
// onDeactivated(() => {
// 	console.log("卸载", show.value);
// });
const show = ref(false);
const showBtn = ref(false);
</script>

<style lang="scss" scoped>
.test__container {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	padding: 4px;
	// overflow: hidden;
}
</style>
