<template>
	<div
		ref="containerDOM"
		class="base-virtual-grid__container"
		:style="{
			height: !scrollContainer ? '100%' : '',
			overflow: !scrollContainer ? 'hidden auto' : '',
		}"
	>
		<!-- 包裹容器 -->
		<div
			ref="wrapDOM"
			class="base-virtual-grid__wrap"
			:style="{
				height: `${state.wrapState.height}px`,
			}"
		>
			<template v-for="(item, index) in state.visibleList" :key="item.id">
				<div
					class="base-virtual-grid__item"
					:class="{
						'base-virtual-grid__item__allow-transition': !!allowItemTransition,
					}"
					:style="{
						width: `${state.visiblePosList[index].width}px`,
						height: `${state.visiblePosList[index].height}px`,
						transform: `translate(${state.visiblePosList[index].left}px, ${state.visiblePosList[index].top}px)`,
					}"
				>
					<!-- 插槽出口 -->
					<slot
						v-bind="{
							item,
							index: state.visiblePosList[index].realIndex,
						}"
					>
					</slot>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	computed,
	nextTick,
	onActivated,
	onDeactivated,
	onMounted,
	reactive,
	useTemplateRef,
	watch,
} from "vue";

import type { Item, Pos } from "./type";

import { useDebounceFn, useResizeObserver, useScroll } from "@vueuse/core";

defineOptions({
	name: "base-virtual-grid",
});

const props = withDefaults(
	defineProps<{
		/** 数据列表 */
		items: Item[];
		/** gap 布局间隔 @default 5 */
		gap?: number;
		/** 列数 */
		columns?: number;
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
		/** 滚动容器 (默认使用组件的容器) @default undefined */
		scrollContainer?: HTMLElement | null;
		/** item 使用过度效果 (开启过渡后可能存在性能问题) @default false */
		allowItemTransition?: boolean;
	}>(),
	{
		items: () => [],
		gap: 5,
		columns: 3,
	}
);

// s 容器DOM
const containerDOM = useTemplateRef("containerDOM");
// s wrap容器DOM
const wrapDOM = useTemplateRef("wrapDOM");

// s 状态数据
const state = reactive({
	list: [] as Item[], // 所有item列表
	visibleList: [] as Item[], // 可见的item列表
	itemsPos: [] as Pos[], // 所有item的位置信息列表
	visiblePosList: [] as Pos[], // 可见item的位置信息列表
	isFreeze: false,
	viewportState: {
		width: 0,
		height: 0,
		scrollWidth: 0,
		scrollHeight: 0,
		paddingTop: 0,
	},
	wrapState: {
		width: 0,
		height: 0,
	},
	scrollState: useScroll(containerDOM),
});

// j 滚动容器的DOM
const scrollContainerDOM = computed(() => {
	return props.scrollContainer ? props.scrollContainer : containerDOM.value;
});

// j 每列列宽
const columnWidth = computed(() => {
	const colWidth =
		(state.wrapState.width - (safeColumns.value - 1) * safeGap.value) /
		safeColumns.value;
	return colWidth;
});

// j 间隙 (从prop中安全的获取结果)
const safeGap = computed(() => {
	return props.gap >= 0 ? props.gap : 0;
});

// j 列数 (从prop中安全的获取结果)
const safeColumns = computed(() => {
	// 判断是否传入breakpoints
	if (props.breakpoints && Object.keys(props.breakpoints).length > 0) {
		// 从最大的断点开始检查
		for (const breakpoint of sortedBreakpoints.value) {
			if (state.wrapState.width >= breakpoint) {
				// 找到第一个满足条件的断点，并返回其列数
				return props.breakpoints[breakpoint];
			}
		}
		// 如果容器宽度小于所有断点，则返回最小断点的列数（通常是 '0' 键）
		return props.breakpoints[0];
	} else {
		return props.columns > 0 ? props.columns : 1;
	}
});

// j 缓存和排序断点键名，只执行一次
const sortedBreakpoints = computed(() => {
	return Object.keys(props.breakpoints || {})
		.map((key) => parseInt(key))
		.sort((a, b) => b - a); // 降序排序，从最大断点开始检查
});

// w 组件挂载时进行初始化
onMounted(() => {
	init();
});

// f 初始化
async function init() {
	await nextTick();

	state.wrapState.width = wrapDOM.value?.clientWidth || 0;
	state.viewportState.width =
		(!!props.scrollContainer
			? containerDOM.value?.clientWidth
			: state.wrapState.width) || 0;

	// ? 组件挂载后重新绑定滚动容器 (因为挂载前可能传入scrollContainer还未挂载)
	state.scrollState = reactive(
		useScroll(scrollContainerDOM.value, {
			onScroll(_e) {
				computeVisibleStateRAF();
			},
		})
	);

	// ? 监听滚动容器的尺寸
	useResizeObserver(scrollContainerDOM.value, (entries) => {
		if (state.isFreeze) return;

		state.viewportState.width = entries[0].contentRect.width;
		state.viewportState.height = entries[0].contentRect.height;
		state.viewportState.scrollWidth = entries[0].target.scrollWidth;
		state.viewportState.scrollHeight = entries[0].target.scrollHeight;

		state.viewportState.paddingTop = Math.floor(
			(wrapDOM.value?.getBoundingClientRect().y || 0) +
				state.scrollState.y -
				(props.scrollContainer?.getBoundingClientRect().y || 0)
		);

		state.wrapState.width = wrapDOM.value?.clientWidth || 0;
		computedItemPosDebounce(props.items);
	});

	// ? 初始化完成后立即执行一次布局计算
	computedItemPosDebounce(props.items);
}

watch(
	[() => props.items, () => safeColumns.value],
	async ([newItems]) => {
		await nextTick();
		// items、gap 发生变化时重新计算布局
		computedItemPosDebounce(newItems);
	},
	{ deep: true }
);

const computedItemPosDebounce = useDebounceFn((list: Item[]) => {
	requestAnimationFrame(async () => {
		await computedItemPos(list);
		computeVisibleStateRAF();
	});
}, 100);

// f 计算所有item位置
async function computedItemPos(list: Item[]) {
	await nextTick();
	if (state.isFreeze) return;

	const width = columnWidth.value;
	const height = width;
	const column = safeColumns.value;
	const gap = safeGap.value;

	const newPos: Pos[] = new Array(list.length);
	for (let index = 0; index < list.length; index++) {
		const left = (width + gap) * (index % column);
		const top = (height + gap) * Math.floor(index / column);
		newPos[index] = {
			id: list[index].id,
			realIndex: index,
			left,
			top,
			width,
			height,
		};
	}

	// 批量替换响应式 itemsPos —— 这只会触发一次更新
	state.itemsPos = newPos;

	// 如果你维护 state.list 同步必要，类似批量替换
	state.list = list;

	// wrap height 也批量算（不要在循环里赋值）
	const row = Math.ceil(list.length / column);
	state.wrapState.height = height * row + gap * (row - 1);
}

// 使用 rAF 封装
let ticking = false;
const computeVisibleStateRAF = () => {
	if (!ticking) {
		requestAnimationFrame(() => {
			computeVisibleState();
			ticking = false;
		});
		ticking = true;
	}
};

// f 计算可见可见状态
function computeVisibleState() {
	if (state.isFreeze) return;
	const itemHeight = columnWidth.value;
	const gap = safeGap.value;
	const h = itemHeight + gap;
	const cols = safeColumns.value;

	// 计算paddingTop
	const paddingTop = state.viewportState.paddingTop;
	let scrollY = Math.floor(state.scrollState.y);
	// 根据paddingTop进行修正
	if (!!props.scrollContainer) {
		scrollY = scrollY > paddingTop ? scrollY - paddingTop : 0;
	}

	const startRow = Math.floor(scrollY / h);
	const endRow = Math.floor((scrollY + state.viewportState.height) / h);

	const startIndex = startRow * cols;
	const endIndex = Math.min((endRow + 1) * cols - 1, state.list.length - 1);

	state.visibleList = state.list.slice(startIndex, endIndex + 1);
	state.visiblePosList = state.itemsPos.slice(startIndex, endIndex + 1);
}

/**
 * f 滚动到指定元素位置
 * @param id 元素id
 */
async function scrollToItem(id: string) {
	await nextTick();
	// 如果没有滚动容器则直接返回
	if (!scrollContainerDOM.value) return;
	const index = state.list.findIndex((item) => item.id === id);
	// 如果找不到元素则直接返回
	if (index < 0) return;
	// 拿到元素位置信息
	const pos = state.itemsPos[index];
	// 如果找不到元素位置信息则直接返回
	if (!pos) return;
	const { left, top, width, height } = pos;
	// 拿到滚动容器信息
	const { scrollLeft, scrollTop, clientWidth, clientHeight } =
		scrollContainerDOM.value;
	// 计算目标滚动位置
	const scrollLeftTarget = Math.max(0, left - (clientWidth - width) / 2);
	const scrollTopTarget = Math.max(0, top - (clientHeight - height) / 2);
	// 只有当目标位置与当前位置不同时才滚动
	if (scrollLeft !== scrollLeftTarget || scrollTop !== scrollTopTarget) {
		scrollContainerDOM.value.scrollTo({
			left: scrollLeftTarget,
			top: scrollTopTarget,
			behavior: "smooth",
		});
	}
}

// w 当组件冻结时
onDeactivated(() => {
	state.isFreeze = true;
});
// w 当组件激活时 (挂载时也会触发)
onActivated(() => {
	state.isFreeze = false;
});

// ? 暴露方法和属性
defineExpose({
	scrollContainerDOM,
	scrollToItem,
});
</script>

<style lang="scss" scoped>
/* 容器 */
.base-virtual-grid {
	/* &__container {
			border: 1px solid rgb(123, 123, 123);
		} */

	&__wrap {
		position: relative;
		width: 100%;
	}

	&__item {
		position: absolute;
		/* overflow: hidden; */
		/* background-color: rgba(126, 126, 126, 0.3); */
		&__allow-transition {
			will-change: transform;
			transition: 0.5s ease;
		}
	}
}
</style>
