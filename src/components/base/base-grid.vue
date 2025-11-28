<template>
	<div ref="container" class="base-grid__container">
		<slot></slot>
	</div>
</template>

<script setup lang="ts">
import { useElementSize, watchDebounced } from "@vueuse/core";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

const props = withDefaults(
	defineProps<{
		/** 列数 */
		columns?: number;
		/** gap */
		gap?: number;
		/**
		 * 断点 (响应式列数)
		 * - 若传入该属性列数将依据 `columns` 属性
		 * @example
		 * {
		 *	 '0': 1,	// 0px及以上：1列
		 *	 '320': 2,	// 320px及以上：2列
		 *	 '480': 3,	// 480px及以上：3列
		 *	 '768': 4,	// 768px及以上：4列
		 *	 '1024': 5,	// 1024px及以上：5列
		 *	 '1200': 6,	// 1200px及以上：6列
		 *	 '1440': 7,	// 1440px及以上：7列
		 *	}
		 */
		breakpoints?: Record<string, number>;
	}>(),
	{
		columns: 6,
		gap: 0,
	}
);

const debouncedColumns = ref(1);
onMounted(() => {
	debouncedColumns.value = props.columns;
});
watchDebounced(
	() => props.columns,
	(v) => {
		debouncedColumns.value = v <= 0 ? 1 : v;
	},
	{
		debounce: 500,
		// maxWait: 500,
	}
);

const container = useTemplateRef("container");
const { width: containerWidth, stop: stopObserver } = useElementSize(container);
onUnmounted(() => stopObserver());

// j 动态计算列数
const columns = computed<number>(() => {
	// 判断是否传入breakpoints
	if (props.breakpoints && Object.keys(props.breakpoints).length > 0) {
		// 从最大的断点开始检查
		for (const breakpoint of sortedBreakpoints.value) {
			if (containerWidth.value >= breakpoint) {
				// 找到第一个满足条件的断点，并返回其列数
				return props.breakpoints[breakpoint];
			}
		}
		// 如果容器宽度小于所有断点，则返回最小断点的列数（通常是 '0' 键）
		return props.breakpoints[0];
	} else {
		return debouncedColumns.value;
	}
});

// j 缓存和排序断点键名，只执行一次
const sortedBreakpoints = computed(() => {
	return Object.keys(props.breakpoints || {})
		.map((key) => parseInt(key))
		.sort((a, b) => b - a); // 降序排序，从最大断点开始检查
});

const debouncedGap = ref(1);
onMounted(() => {
	debouncedGap.value = props.gap;
});
watchDebounced(
	() => props.gap,
	(v) => {
		debouncedGap.value = v < 0 ? 0 : v;
	},
	{
		debounce: 500,
		// maxWait: 500,
	}
);
</script>

<style lang="scss" scoped>
/* 容器 */
.base-grid__container {
	display: grid;
	grid-template-columns: repeat(v-bind("columns"), minmax(0, 1fr));
	gap: calc(v-bind("debouncedGap") * 1px);
}
</style>
