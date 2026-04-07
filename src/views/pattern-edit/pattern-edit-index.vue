<template>
	<BaseFlex class="re-pattern-edit" :gap="4">
		<!-- 规则侧栏 -->
		<aside class="re-pattern-tree">
			<Tree />
		</aside>
		<!-- 规则表单 -->
		<main class="re-pattern-form">
			<Form />
		</main>
	</BaseFlex>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import Tree from "./pattern-tree.vue";
import Form from "./pattern-form.vue";
import { BaseFlex } from "base-ui";
import { usePatternStore } from "@/stores";
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
* {
	box-sizing: border-box;
}

.re-pattern-edit {
	position: relative;
	height: 100%;
	padding: 4px;
	overflow-y: hidden;
	overflow-x: auto;

	scrollbar-color: rgb(85, 170, 255) transparent;
	overscroll-behavior: contain;
	pointer-events: all;

	.re-pattern-tree {
		position: relative;
		box-sizing: border-box;
		min-width: 230px;
		width: 300px;
		height: 100%;

		overflow: hidden;

		z-index: 1;
	}

	.re-pattern-form {
		flex: auto;
		min-width: 425px;
		max-width: 800px;

		height: 100%;
	}
}
</style>
