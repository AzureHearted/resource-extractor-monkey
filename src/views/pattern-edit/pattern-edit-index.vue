<template>
	<div class="pattern-edit__container">
		<!-- 规则侧栏 -->
		<aside class="pattern-tree">
			<Tree />
		</aside>
		<!-- 规则表单 -->
		<main class="pattern-form">
			<BaseScrollbar>
				<Form />
			</BaseScrollbar>
		</main>
	</div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import Tree from "./pattern-tree.vue";
import Form from "./pattern-edit-form.vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import usePatternStore from "@/stores/PatternStore";
import { onActivated } from "vue";

const patternStore = usePatternStore();
const { getUserPatternInfo } = patternStore;

onMounted(() => {
	getUserPatternInfo(); //获取本地方案信息
});
onActivated(() => {
	getUserPatternInfo(); //获取本地方案信息
});
</script>

<style lang="scss" scoped>
.pattern-edit__container {
	box-sizing: border-box;
	position: relative;
	display: flex;
	flex-flow: row nowrap;
	gap: 8px;
	height: 100%;
	padding: 4px;
	overflow-y: hidden;
	overflow-x: auto;

	.pattern-tree {
		position: relative;
		box-sizing: border-box;
		min-width: 230px;
		max-width: 235px;
		// padding: 4px;
		height: 100%;

		// background-color: wheat;
		// border-radius: 4px;
		overflow: hidden;

		z-index: 1;
	}

	.pattern-form {
		flex: auto;
		// background-color: orange;
		min-width: 425px;
		max-width: 800px;

		height: 100%;
		overflow: auto;
		// padding: 4px;
	}
}

:deep(input) {
	background: white;
	box-shadow: unset;
	&[type="text"] {
		color: #606266 !important;
	}
}
</style>
