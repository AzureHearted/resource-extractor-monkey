<!-- 分栏组件 -->
<template>
	<div
		ref="containerRef"
		class="base-split__container"
		:data-orientation="safeOrientation"
	>
		<!-- first区域 -->
		<div ref="firstRef" class="base-split__first" :style="[firstContentStyle]">
			<slot name="1"></slot>
		</div>
		<!-- 控制条 -->
		<div
			ref="resizeRef"
			class="base-split__resize base-split__resize__cursor-hover-resize"
			tabindex="0"
			@mousedown.prevent="handleMouseDown"
			@mouseover.passive="handleMouseOver"
		></div>
		<!-- second区域 -->
		<div
			ref="secondRef"
			class="base-split__second"
			:style="[secondContentStyle]"
		>
			<slot name="2"></slot>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, useTemplateRef } from "vue";
import type { CSSProperties } from "vue";

defineOptions({
	name: "base-split",
});

const props = withDefaults(
	defineProps<{
		/** 方向 @default "horizontal" */
		orientation?: "horizontal" | "vertical";
		/** 控制条宽度 (像素) @default 1 */
		controlBarSize?: number;
		/** 控制条悬浮后的扩展宽度 (像素) @default 0.5 */
		controlBarHoverExtend?: number;
		/** 控制条热区左右各扩展宽度 (像素) @default 2 */
		controlBarHotAreaExtend?: number;
		/** 每个区域允许的最小宽度百分比 @default 0.1 */
		minSizePercent?: number;
		/** first 区域的样式 */
		firstContentStyle?: CSSProperties;
		/** second 区域的样式 */
		secondContentStyle?: CSSProperties;
		/** first 区域的 Overflow 样式 @default "auto" */
		firstContentOverflow?: CSSProperties["overflow"];
		/** second 区域的 Overflow 样式 @default "auto" */
		secondContentOverflow?: CSSProperties["overflow"];
		/** 控制条的颜色 @default hsl(228, 3%, 31%) */
		controlBarColor?: CSSProperties["color"];
		/** 鼠标悬浮控制条时候的颜色 @default hsl(211, 58%, 49%) */
		controlBarHoverColor?: CSSProperties["color"];
	}>(),
	{
		orientation: "horizontal",
		controlBarSize: 1,
		controlBarHoverExtend: 0.5,
		controlBarHotAreaExtend: 2,
		minSizePercent: 0.1,
		firstContentOverflow: "auto",
		secondContentOverflow: "auto",
		controlBarColor: "hsl(228, 3%, 31%)",
		controlBarHoverColor: "hsl(211, 58%, 49%)",
	}
);

// DOM引用
const containerRef = useTemplateRef("containerRef");
const firstRef = useTemplateRef("firstRef");
const resizeRef = useTemplateRef("resizeRef");

// s 状态数据
const state = reactive({
	isDragging: false, // 拖拽标识符
});

// s 分栏比例 (父组件传入)
const percentage = defineModel("percentage", { type: Number, default: 0.5 });

// j 布局方向 (通过props安全的获取)
const safeOrientation = computed(() => {
	return !!props.orientation ? props.orientation : "horizontal";
});

// j 分栏占比 (通过props或model安全的获取)
const safePercentage = computed({
	get: () => {
		const min = props.minSizePercent;
		let percent = percentage.value;
		if (percent > 1 - min) percent = 1 - min;
		if (percent < min) percent = min;
		return percent;
	},
	set(v) {
		const min = props.minSizePercent;
		let percent = v;
		if (percent > 1 - min) percent = 1 - min;
		if (percent < min) percent = min;
		percentage.value = percent;
	},
});

// j 控制条最大尺寸(含不可见尺寸)
const controlBarTotalSize = computed(() => {
	return Math.max(
		props.controlBarSize + props.controlBarHoverExtend * 2,
		props.controlBarSize + props.controlBarHotAreaExtend * 2
	);
});

// f 鼠标按下分栏控制条的回调
function handleMouseDown(e: MouseEvent) {
	const containerDom = containerRef.value!;
	const firstDOM = firstRef.value!;

	const orientation = safeOrientation.value;

	// ? 先清空选区
	window.getSelection()?.removeAllRanges();

	// 鼠标起始位置
	let start = orientation == "horizontal" ? e.clientX : e.clientY;

	// first 区域起始宽度
	const firstStartSize =
		orientation == "horizontal" ? firstDOM.offsetWidth : firstDOM.offsetHeight;

	// 设置全局鼠标样式
	document.body.style.cursor =
		orientation == "horizontal" ? "col-resize" : "row-resize";

	// 注册：鼠标移动事件
	document.addEventListener("mousemove", handleMouseMove);
	let rafId: number | null = null;
	function handleMouseMove(e: MouseEvent) {
		// 标记为正在拖拽
		state.isDragging = true;
		// 鼠标拖动的终止位置
		let end = orientation == "horizontal" ? e.clientX : e.clientY;

		// ? 计算 first 区域结束位置宽度
		let firstEndSize = firstStartSize + (end - start);

		// 计算容器减去控制条的剩余空间
		const remainContainerSize =
			orientation == "horizontal"
				? containerDom.offsetWidth
				: containerDom.offsetHeight;

		// ? 计算 first 区域在容器中的占比 (其中包含控制条宽度的一半)
		const firstPercentage =
			(firstEndSize + props.controlBarSize / 2) / remainContainerSize;

		// 若持续执行则清除上一次的raf句柄
		if (rafId) cancelAnimationFrame(rafId);
		// 下一个渲染帧更新
		rafId = requestAnimationFrame(() => {
			// 更新分区比例，并更新父组件传入的 percentage
			// safePercentage.value = update(firstPercentage);
			safePercentage.value = firstPercentage;
			rafId = null;
		});
	}

	// 注册：鼠标松开事件
	document.addEventListener("mouseup", handleMouseUp);
	function handleMouseUp(_e: MouseEvent) {
		// 标记为正在未拖拽
		state.isDragging = false;
		// 移除监听注册
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
		// 移除全局鼠标样式
		document.body.style.cursor = "";
	}
}

// f 处理鼠标悬浮控制条事件
function handleMouseOver(e: MouseEvent) {
	const containerDom = containerRef.value;
	const firstDom = firstRef.value;
	const resizeDom = resizeRef.value;

	if (state.isDragging) {
		resizeDom?.classList.add("base-split__resize__cursor-hover-resize");
		return;
	}

	if (!containerDom || !firstDom || !resizeDom) return;

	if (e.buttons) {
		resizeDom.classList.remove("base-split__resize__cursor-hover-resize");
	} else {
		resizeDom.classList.add("base-split__resize__cursor-hover-resize");
	}
}
</script>

<style lang="scss" scoped>
/* 控制条宽度 */
$resizeControlSize: calc(v-bind("props.controlBarSize") * 1px);
/* 控制条热区扩展尺寸 */
$resizeControlHotAreaExtend: calc(
	v-bind("props.controlBarHotAreaExtend") * 1px
);
/* 控制条hover扩展尺寸 */
$resizeControlHoverAreaExtend: calc(
	v-bind("props.controlBarHoverExtend") * 1px
);
/** 安全尺寸 */
$safeSize: calc(
	(v-bind("controlBarTotalSize") * 1px) / 2 - $resizeControlSize / 2
);

.base-split {
	&__container {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		display: flex;
	}

	$resize-color: v-bind("props.controlBarColor");
	$resize-hover-color: v-bind("props.controlBarHoverColor");

	&__first,
	&__second {
		position: relative;
	}

	/* 水平分栏布局 */
	&__container[data-orientation="horizontal"] {
		flex-flow: row nowrap;

		/* first 区域样式 */
		& > .base-split__first {
			flex-shrink: 0;
			width: calc(v-bind("safePercentage") * 100% - $resizeControlSize / 2);
			min-width: $safeSize;
			max-width: calc(100% - (v-bind("controlBarTotalSize") * 1px) + $safeSize);
			height: 100%;
			overflow: v-bind("props.firstContentOverflow");
		}

		/* 拖拽控制条 */
		& > .base-split__resize {
			flex-shrink: 0;
			position: relative;
			background-color: $resize-color;
			/* 分栏条宽度 */
			width: $resizeControlSize;
			background-size: cover;
			background-position: center;

			/* 拖拽控制条：视觉条 */
			&::after {
				content: "";
				position: absolute;
				inset: 0;
				width: $resizeControlSize;
				height: 100%;
				transition: width 0.15s, left 0.15s, background-color 0.15s, inset 0.15s;
			}

			/* 拖拽控制条：扩展控条热区 */
			&::before {
				content: "";
				position: absolute;
				top: 0;
				bottom: 0;
				left: calc(-1 * $resizeControlHotAreaExtend);
				right: calc(-1 * $resizeControlHotAreaExtend);
				/* 不要设置背景，保持透明！ */
				/* background-color: rgba(255, 0, 0, 0.482); */
				z-index: 1;
			}

			/* 鼠标悬浮和激活的样式 */
			&.base-split__resize__cursor-hover-resize {
				cursor: col-resize;
				&:hover::after,
				&:active::after {
					inset: 0;
					height: 100%;
					width: calc($resizeControlSize + ($resizeControlHoverAreaExtend * 2));
					left: calc(-1 * $resizeControlHoverAreaExtend);
					background-color: $resize-hover-color;
				}
			}
		}

		/* second 区域样式 */
		& > .base-split__second {
			flex: 1;
			flex-shrink: 1;
			height: 100%;
			overflow: v-bind("props.secondContentOverflow");
			/* box-shadow:inset 0 0 10px 10px white; */
			/* background: teal; */
		}
	}

	/* 垂直分栏布局 */
	&__container[data-orientation="vertical"] {
		flex-flow: column nowrap;

		/* first 区域样式 */
		& > .base-split__first {
			height: calc(v-bind("safePercentage") * 100% - $resizeControlSize / 2);
			min-height: $safeSize;
			max-height: calc(
				100% - (v-bind("controlBarTotalSize") * 1px) + $safeSize
			);
			width: 100%;
			overflow: v-bind("props.firstContentOverflow");
		}

		/* 拖拽控制条 */
		& > .base-split__resize {
			flex-shrink: 0;
			position: relative;
			background-color: $resize-color;
			/* 分栏条宽度 */
			height: $resizeControlSize;
			background-size: cover;
			background-position: center;

			/* 拖拽控制条：视觉条 */
			&::after {
				content: "";
				position: absolute;
				inset: 0;
				width: 100%;
				height: $resizeControlSize;
				transition: height 0.15s, top 0.15s, background-color 0.15s, inset 0.15s;
			}

			/* 拖拽控制条：扩展控条热区 */
			&::before {
				content: "";
				position: absolute;
				top: calc(-1 * $resizeControlHotAreaExtend);
				bottom: calc(-1 * $resizeControlHotAreaExtend);
				left: 0;
				right: 0;
				/* 不要设置背景，保持透明！ */
				/* background-color: rgba(255, 0, 0, 0.482); */
				z-index: 1;
			}

			/* 鼠标悬浮和激活的样式 */
			&.base-split__resize__cursor-hover-resize {
				cursor: row-resize;
				&:hover::after,
				&:active::after {
					inset: 0;
					width: 100%;
					height: calc($resizeControlSize + $resizeControlHoverAreaExtend * 2);
					top: calc(-1 * $resizeControlHoverAreaExtend);
					background-color: $resize-hover-color;
				}
			}
		}

		/* second 区域样式 */
		& > .base-split__second {
			flex: 1;
			width: 100%;
			overflow: v-bind("props.secondContentOverflow");
		}
	}
}
</style>
