<template>
	<div
		ref="container"
		class="base-waterfall__container"
		:data-transition="transitionMode"
		:data-allow-transition="allowTransition"
	>
		<div
			ref="itemRefs"
			v-for="(item, index) in items"
			:key="item.id"
			:data-id="item.id"
			class="base-waterfall__item"
		>
			<slot
				:index="index"
				:item="item"
				:mounted="itemOnMounted"
				:loaded="onLoaded"
			>
				<BaseCard
					:imgUrl="item.src"
					:layout="itemLayout"
					:useThumb="itemUseThumb"
					:imgThumbMaxSize="itemThumbMaxSize"
					shadow="unset"
					hoverShadow="unset"
					backgroundColor="rgb(0,0,0,1)"
					:observerOnce="false"
					@loaded="onLoaded(index, $event)"
					@mounted="itemOnMounted(index)"
				>
					<template #header>
						<slot name="header" :index="index"></slot>
					</template>
					<template #default>
						<slot name="content" :index="index"></slot>
					</template>
					<template #footer>
						<slot name="footer" :index="index"></slot>
					</template>
				</BaseCard>
			</slot>
		</div>
		<!-- ? 空状态 -->
		<div
			class="base-waterfall__empty-state"
			:data-show="items.length < 1"
		></div>
	</div>
</template>

<script lang="ts" setup>
import {
	ref,
	onMounted,
	nextTick,
	watch,
	computed,
	onUnmounted,
	useTemplateRef,
	onDeactivated,
	onActivated,
} from "vue";
import type { ImgReadyInfo } from "./base-img.vue";
import BaseCard from "./base-card.vue";

// t 数据对象定义
export interface Item {
	id: string;
	src: string;
	metadata?: {
		width: number;
		height: number;
	};
	[k: string]: any;
}

const props = withDefaults(
	defineProps<{
		/** 瀑布流数据列表 */
		items: Item[];
		/** 列数 */
		columns?: number;
		/** 间隔 */
		gutter?: number;
		/** `item` 启用缩略图 */
		itemUseThumb?: boolean;
		/** 生成的缩略图最大尺寸 */
		itemThumbMaxSize?: number;
		/** 启用过渡动画 (开启后可能会造成卡顿) */
		allowTransition?: boolean;
		/** 监听视口 (用于设定监听视口，用于图片懒加载) */
		viewport?: IntersectionObserverInit["root"];
		/** 图片的加载只监听一次 */
		observerOnce?: boolean;
		/**
		 * `item` 的结构
		 *  - 注意若使用 `default` 布局模式，且要给 `item` 设置 `header` 或 `footer` ，一定要指定一个固定的 `item-header-height` 和 `item-footer-height`
		 *  @default "absolute"
		 */
		itemLayout?: "absolute" | "default";
		/** `item` 的 `header` 高度 @default 0 */
		itemHeaderHeight?: number;
		/** `item` 的 `footer` 高度 @default 0 */
		itemFooterHeight?: number;
	}>(),
	{
		// 默认示例
		items: () => [],
		columns: 3,
		gutter: 4,
		allowTransition: true,
		itemLayout: "absolute",
		itemUseThumb: false,
		itemThumbMaxSize: 500,
		itemHeaderHeight: 0,
		itemFooterHeight: 0,
	}
);

const container = useTemplateRef("container");
const itemRefs = useTemplateRef("itemRefs");

// j 列数 (从prop中安全的获取结果)
const safeColumns = computed(() => {
	return props.columns > 0 ? props.columns : 1;
});
// j 间隙 (从prop中安全的获取结果)
const safeGutter = computed(() => {
	return props.gutter >= 0 ? props.gutter : 0;
});

// s 容器宽度
const containerWidth = ref(0);

// s 过渡模式
const transitionMode = ref<"extend" | "shrink">("extend");
// w 根据容器宽度和列数变化选择相应的布局过渡动画
watch(
	[containerWidth, safeColumns],
	([newWidth, newColumns], [oldWidth, oldColumns]) => {
		if (newWidth > oldWidth || newColumns < oldColumns) {
			transitionMode.value = "extend";
		}
		if (newWidth < oldWidth || newColumns > oldColumns) {
			transitionMode.value = "shrink";
		}
	}
);

// s 容器高度
const containerHeight = ref(0);

// j 每列列宽
const columnWidth = computed(() => {
	const colWidth =
		(containerWidth.value - (safeColumns.value - 1) * safeGutter.value) /
		safeColumns.value;
	return colWidth;
});

// s 记录每列高度的数组
const columnHeights = Array(safeColumns.value).fill(0);

let observer: ResizeObserver | null = null;

// w 组件挂载初始化
onMounted(() => {
	// ? 首次获取容器宽度
	containerWidth.value = container.value!.clientWidth;
	observer = useResizeObserver(container.value!, (width) => {
		// ? 通过ResizeObserver监听容器尺寸变化
		containerWidth.value = width;
		// await nextTick()
		// scheduleLayout();
		debounceHandleTask(scheduleLayout);
		// console.log("尺寸变化");
	});
});

// ? 监听items
watch(
	() => props.items,
	(newItems) => {
		// console.log(newItems);
		// ? 当items被清空时清空 columnHeights 中的缓存高度并且重置容器高度
		if (newItems.length === 0) {
			columnHeights.splice(0, columnHeights.length);
			containerHeight.value = 0;
		} else if (newItems.length > 0) {
			debounceHandleTask(scheduleLayout);
		}
	},
	{ deep: true }
);

// f item组件挂载的回调
function itemOnMounted(index: number) {
	// await nextTick()
	// console.log(`挂载完成:${index}`);
	const item = itemRefs.value![index];
	const itemInfo = props.items[index];

	let aspectRatio = 1;
	if (
		itemInfo.metadata &&
		itemInfo.metadata.width &&
		itemInfo.metadata.height
	) {
		// ? 如果metadata有效则使用metadata数据计
		aspectRatio = itemInfo.metadata.width / itemInfo.metadata.height;
	}

	const scaledHeight =
		columnWidth.value / aspectRatio +
		(props.itemLayout == "default"
			? props.itemHeaderHeight + props.itemFooterHeight
			: 0);
	// 找最短列
	const minCol = columnHeights.indexOf(Math.min(...columnHeights));
	const top = columnHeights[minCol];
	const left = minCol * (columnWidth.value + safeGutter.value);

	item.style.setProperty("--x", `${left}px`);
	item.style.setProperty("--y", `${top}px`);
	item.style.setProperty("--w", `${columnWidth.value}px`);
	item.style.setProperty("--h", `${scaledHeight}px`);
	item.dataset["aspectRatio"] = String(aspectRatio);
}

// 组件卸载时移除监听器
onUnmounted(() => {
	observer?.disconnect();
});

// ? 监听columns和gutter
watch([safeColumns, safeGutter], async ([_newColumns, _newGutter]) => {
	// columns, gutter 变化时重新布局
	await nextTick();
	// scheduleLayout();
	debounceHandleTask(scheduleLayout);
});

let pending = false; // 本帧是否计划执行
let lastLayoutTime = 0; // 上一次执行布局的时间
const MAX_DELAY = 50; // 最多 50ms 强制执行一次

// ? 用requestAnimationFrame封装的布局函数
function scheduleLayout() {
	const now = performance.now();

	// 如果太久没执行，立刻执行一次
	if (now - lastLayoutTime > MAX_DELAY) {
		layout(safeColumns.value, safeGutter.value);
		lastLayoutTime = now;
		return;
	}

	// 若已经注册过 rAF，则不再注册
	if (pending) return;
	pending = true;

	requestAnimationFrame(() => {
		pending = false;
		layout(safeColumns.value, safeGutter.value);
		lastLayoutTime = performance.now();
	});
}

let timer: number = 0;
let nowTask: Function = () => {};
/**
 * f 防抖任务执行函数
 * - 多次触发事件时，只执行最后一次
 * @param {Function} task 任务
 * @param {number} delay 延时
 */
function debounceHandleTask(task: Function, delay: number = 300) {
	// 先记录任务
	if (task instanceof Function) {
		nowTask = task;
	}

	clearTimeout(timer);

	timer = window.setTimeout(() => {
		nowTask();
		clearTimeout(timer);
	}, delay);
}

// 组件冻结标识符
let isFreeze = false;
// 组件被冻结时的回调
onDeactivated(() => {
	isFreeze = true;
	// console.log("组件被冻结",cacheItemRectMap)
});

onActivated(() => {
	isFreeze = false;
	// console.log("组件被激活",cacheItemRectMap)
});

// 缓存items位置
// const cacheItemRectMap = new Map<
//   HTMLElement,
//   { width: number; height: number; left: number; top: number }
// >();

/**
 * f 布局方法
 * @param {number} newColumns 列数
 * @param {number} newGutter 间隔
 */
function layout(newColumns: number, newGutter: number) {
	if (!container.value || isFreeze) return;

	// 重置每列高度
	const newColumnHeights = Array(newColumns).fill(0);

	const rectMap = new Map<
		HTMLElement,
		{ width: number; height: number; left: number; top: number }
	>();
	// 先清空缓存
	// cacheItemRectMap.clear();

	// ? 遍历所有图片重新布局
	props.items.forEach((item, _index) => {
		const itemDOMRef = itemRefs.value?.find((x) => x.dataset.id === item.id);
		if (!itemDOMRef) return;
		// const itemInfo = props.items[_index];

		// 图片宽高比
		let imageAspectRatio = 1;
		if (item.metadata && item.metadata.width && item.metadata.height) {
			// ? 如果metadata有效则使用metadata数据计算
			imageAspectRatio = item.metadata.width / item.metadata.height;
		} else {
			const aspectRatio = itemDOMRef.dataset["aspectRatio"];
			imageAspectRatio = aspectRatio ? Number(aspectRatio) : 1;
		}

		// 计算缩放后的 item 高度
		const scaledHeight =
			columnWidth.value / imageAspectRatio +
			(props.itemLayout == "default"
				? props.itemHeaderHeight + props.itemFooterHeight
				: 0);

		// 找最短列
		const minCol = newColumnHeights.indexOf(Math.min(...newColumnHeights));
		const top = newColumnHeights[minCol];
		const left = minCol * (columnWidth.value + newGutter);

		// ? 先把样式记录到rectMap中，最后统一修改
		rectMap.set(itemDOMRef, {
			width: columnWidth.value,
			height: scaledHeight,
			left,
			top,
		});

		// 缓存一份
		// cacheItemRectMap.set(item, rect);

		// ? 累加当前最小列高
		newColumnHeights[minCol] += scaledHeight + newGutter;
	});

	// ? 最后统一调整样式
	props.items.forEach((item, _index) => {
		const itemDOMRef = itemRefs.value?.find((x) => x.dataset.id === item.id);
		if (!itemDOMRef) return;
		const rect = rectMap.get(itemDOMRef);
		if (!rect) return;
		const { width, height, left, top } = rect;
		itemDOMRef.style.setProperty("--x", `${left}px`);
		itemDOMRef.style.setProperty("--y", `${top}px`);
		itemDOMRef.style.setProperty("--w", `${width}px`);
		itemDOMRef.style.setProperty("--h", `${height}px`);
	});

	// 更新全局列高度
	columnHeights.splice(0, columnHeights.length, ...newColumnHeights);
	// ? 同时更新容器高度

	containerHeight.value = Math.max(...columnHeights) - newGutter;
}

// f 项目加载函数
function onLoaded(index: number, info: ImgReadyInfo) {
	// console.log(`加载：${index}`);
	// await nextTick();

	requestAnimationFrame(() => {
		const { meta } = info;
		const { aspectRatio } = meta;

		// ? 通过 BaseImg组件中的img标签尺寸计算宽高比
		// const aspectRatio = dom!.clientWidth / dom!.clientHeight;

		const item = props.items[index];
		const itemDOMRef = itemRefs.value?.find((x) => x.dataset.id === item.id);
		if (!itemDOMRef) return;
		// 在dom设置 dataset-aspect-ratio 供布局使用
		itemDOMRef.dataset["aspectRatio"] = String(aspectRatio ? aspectRatio : 1);

		// 必须立即计算布局
		scheduleLayout();

		requestAnimationFrame(() => {
			// 下一帧率再显示图片
			itemDOMRef.dataset["loaded"] = "true";
		});
	});
}

// ? ResizeObserver API的封装
function useResizeObserver(
	target: HTMLElement,
	callback: (width: number, height: number) => void
) {
	// 检查浏览器是否支持 Resize Observer API
	if (!("ResizeObserver" in window)) return null;

	// 创建 Resize Observer 实例，传入回调函数
	const observer = new ResizeObserver((entries) => {
		entries.forEach((entry) => {
			// 在这里执行针对目标元素的 DOM 操作，例如根据尺寸调整样式等
			callback(entry.contentRect.width, entry.contentRect.height);
		});
	});

	// 开始观察目标元素
	observer.observe(target);
	// 返回观察者实例，以便可以停止观察
	return observer;
}

defineExpose({
	scheduleLayout,
	layout,
});
</script>

<style lang="scss" scoped>
.base-waterfall__container {
	position: relative;
	height: calc(v-bind("containerHeight") * 1px);
	/* background-color: rgb(225, 233, 165); */
	/* transition:  0.5s ease; */
	transition: unset;
}

.base-waterfall__item {
	position: absolute;
	opacity: 0;
	width: var(--w);
	height: var(--h);
	transform: translate(var(--x), calc(var(--y))) scale(0.5);
	/* background-color: rgb(0, 175, 175); */

	&[data-loaded] {
		/* position: absolute; */
		opacity: 1;
		width: var(--w);
		height: var(--h);
		transform: translate(var(--x), var(--y)) scale(1);
	}
}

:deep(.base-card__container) {
	height: 100%;
}

:deep(.base-card__container) {
	border: unset;
	border-radius: 4px;
	padding: 4px;

	/* 实现border效果 */
	&::after {
		content: "";
		position: absolute;
		inset: 0px;
		border: 2px solid transparent;
		border-radius: 4px;
		pointer-events: none; /* 不影响鼠标事件 */
		box-sizing: border-box; /* 确保覆盖整个元素 */
	}

	&:focus::after {
		border: 2px solid hsl(210, 100%, 60%); /* 可视边框 */
	}

	.base-card__content {
		overflow: hidden;
		border-radius: 2px;
	}
}

:deep(.img__container) {
	width: 100%;
}

/* 空状态样式 */
.base-waterfall__empty-state {
	&::after {
		content: "";
		position: absolute;
		width: 100%;
		height: 100%;
		/* background-color: orange; */
		opacity: 0;
		z-index: -1;

		display: flex;
		text-align: center;
		justify-content: center;
		align-items: center;

		user-select: none;

		transform: scale(0);
		/* transition: 0.5s ease; */
	}

	&[data-show="true"]::after {
		opacity: 1;
		transform: scale(1);
		/* transition: 0.5s ease 0.5s; */
		user-select: auto;
	}
}

/* 过渡动画 */
.base-waterfall__container[data-allow-transition="true"] {
	&[data-transition="extend"] {
		/* 容器宽度扩展或列数减少时的过渡 (即当item宽度即将的时候) */
		.base-waterfall__item[data-loaded] {
			transition: transform 0.5s ease, opacity 0.5s ease, width 0.3s ease 0.5s,
				height 0.3s ease 0.5s;
		}
	}
	/* 容器宽度缩小或列数增加时的过渡  (即当item缩小即将的时候) */
	&[data-transition="shrink"] {
		.base-waterfall__item[data-loaded] {
			transition: transform 0.5s ease 0.3s, opacity 0.5s ease, width 0.3s ease,
				height 0.3s ease;
		}
	}

	:deep(.img__container) {
		transition: 0.5s ease;
	}
}
</style>
