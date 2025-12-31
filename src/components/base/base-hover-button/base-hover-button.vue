<template>
	<div ref="containerRef" class="base-hover-button" :style="[style, sizeStyle]">
		<div
			ref="mainButtonRef"
			class="base-hover-button__base-button base-hover-button__main-button"
			@click="$emit('main-button-click', $event)"
			v-double-tap="{
				handler: (e) => $emit('main-button-dblclick', e),
			}"
		>
			<slot>
				<icon-carbon-software-resource-cluster />
			</slot>
		</div>
		<!-- 展开按钮容器 -->
		<div
			class="base-hover-button__extra-wrapper"
			:style="{ '--total': extraVNode.length }"
		>
			<div
				v-for="(node, index) in extraVNode"
				:key="index"
				class="base-hover-button__base-button base-hover-button__extra-button"
				:style="{ '--i': index }"
			>
				<component :is="node" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	unrefElement,
	useDraggable,
	useElementBounding,
	useElementSize,
	useWindowSize,
} from "@vueuse/core";
import type { MaybeComputedElementRef } from "@vueuse/core";
import {
	computed,
	onMounted,
	onUnmounted,
	reactive,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import type { StyleValue } from "vue";

import { vDoubleTap } from "@/hooks/useBaseTap";
import type { TapEvent } from "@/hooks/useBaseTap";

defineOptions({
	name: "base-hover-button",
});

const slots = defineSlots<{
	default(props: {}): any;
	extra(props: {}): any;
}>();

const props = withDefaults(
	defineProps<{
		/** 边界容器 (如果不传入则默认使用窗口尺寸)  */
		boundaryContainer?: MaybeComputedElementRef;
		/** 初始位置 (相对于右下角定位)  @default { right: 10, bottom: 20 }  */
		initPosition?: {
			right: number;
			bottom: number;
		};
		/** 安全边界 @default { left: 4, top: 4, right: 4, bottom: 4 } */
		safeBoundary?: {
			left: number;
			top: number;
			right: number;
			bottom: number;
		};
	}>(),
	{
		initPosition: () => ({
			right: 10,
			bottom: 20,
		}),
		safeBoundary: () => ({
			left: 4,
			top: 4,
			right: 4,
			bottom: 4,
		}),
	}
);

// 自定义事件
const emits = defineEmits<{
	"main-button-click": [e?: MouseEvent];
	"main-button-dblclick": [e?: TapEvent];
}>();

// 组件容器
const containerRef = useTemplateRef("containerRef");
const containerBounding = useElementBounding(containerRef);
const mainButtonRef = useTemplateRef("mainButtonRef");

// s 状态数据
const state = reactive({
	size: 50,
	// 默认位置
	defaultPosition: {
		right: props.initPosition.right,
		bottom: props.initPosition.bottom,
	},
	boundaryDOM: null as MaybeComputedElementRef,
	/** 冻结标识符 */
	isFreezed: false,
});

// 容器尺寸
let boundarySize:
	| ReturnType<typeof useElementSize>
	| ReturnType<typeof useWindowSize>;
let boundaryBounding: ReturnType<typeof useElementBounding>;

let style: ReturnType<typeof useDraggable>["style"];
let position: ReturnType<typeof useDraggable>["position"];

// w 组件挂载时
onMounted(() => {
	state.boundaryDOM = unrefElement(props.boundaryContainer);
	if (state.boundaryDOM) {
		const { stop, width, height } = useElementSize(state.boundaryDOM);
		boundarySize = { width, height };
		boundaryBounding = useElementBounding(state.boundaryDOM);
		onUnmounted(() => {
			stop();
		});
	} else {
		boundarySize = useWindowSize({ includeScrollbar: false });
		boundaryBounding = {
			...boundarySize,
			x: ref(0),
			y: ref(0),
			top: ref(0),
			left: ref(0),
			bottom: boundarySize.height,
			right: boundarySize.width,
			update() {},
		};
	}

	// 配置拖拽
	({ style, position } = useDraggable(containerRef, {
		handle: mainButtonRef,
		initialValue: () => {
			boundaryBounding.update();
			const { width, height, bottom, right } = boundaryBounding;
			if (width.value && height.value) {
				return {
					x: right.value - state.size - state.defaultPosition.right,
					y: bottom.value - state.size - state.defaultPosition.bottom,
				};
			} else {
				return {
					x: 0,
					y: 0,
				};
			}
		},
		onMove(pos) {
			// 实时记录元素到四周的距离

			const newPos = { x: pos.x, y: pos.y };
			const {
				bottom: bBottom,
				right: bRight,
				left: bLeft,
				top: bTop,
			} = boundaryBounding;
			const { width: cWidth, height: cHeight } = containerBounding;

			// 上下边界
			if (
				newPos.y + cHeight.value >
				bBottom.value - props.safeBoundary.bottom
			) {
				newPos.y = bBottom.value - props.safeBoundary.bottom - cHeight.value;
			}
			if (newPos.y < bTop.value + props.safeBoundary.top) {
				newPos.y = bTop.value + props.safeBoundary.top;
			}
			// 左右边界
			if (newPos.x + cWidth.value > bRight.value - props.safeBoundary.right) {
				newPos.x = bRight.value - props.safeBoundary.right - cWidth.value;
			}
			if (newPos.x < bLeft.value + props.safeBoundary.left) {
				newPos.x = bLeft.value + props.safeBoundary.left;
			}

			state.defaultPosition = {
				right: Math.round(
					boundaryBounding.right.value - (newPos.x + cWidth.value)
				),
				bottom: Math.round(
					boundaryBounding.bottom.value - (newPos.y + cHeight.value)
				),
			};

			position.value = newPos;
		},
	}));

	// 监听容器bounding变化
	watch(
		() => boundaryBounding,
		(bounding) => {
			if (state.isFreezed) return;

			// 如果还没拖拽过就按照默认位置调整
			requestAnimationFrame(() => {
				const { right: defaultRight, bottom: defaultBottom } =
					state.defaultPosition;
				const {
					bottom: bBottom,
					right: bRight,
					left: bLeft,
					top: bTop,
				} = bounding;
				const { width: cWidth, height: cHeight } = containerBounding;
				const newPos = { x: position.value.x, y: position.value.y };
				newPos.x = bRight.value - cWidth.value - defaultRight;
				newPos.y = bBottom.value - cHeight.value - defaultBottom;

				// 上下边界
				if (
					newPos.y + cHeight.value >
					bBottom.value - props.safeBoundary.bottom
				) {
					newPos.y = cHeight.value - bBottom.value + props.safeBoundary.bottom;
				}
				if (newPos.y < bTop.value + props.safeBoundary.top) {
					newPos.y = bTop.value + props.safeBoundary.top;
				}
				// 左右边界
				if (newPos.x + cWidth.value > bRight.value - props.safeBoundary.right) {
					newPos.x = cWidth.value - bRight.value + props.safeBoundary.right;
				}
				if (newPos.x < bLeft.value + props.safeBoundary.left) {
					newPos.x = bLeft.value + props.safeBoundary.left;
				}

				position.value = newPos;
			});
		},
		{ deep: true }
	);
});

// 尺寸样式
const sizeStyle = computed<StyleValue>(() => {
	if (state.boundaryDOM) {
		return {
			width: `${state.size}px`,
			height: `${state.size}px`,
			left: `${position.value.x}px`,
			top: `${position.value.y}px`,
		};
	} else {
		return {
			width: `${state.size}px`,
			height: `${state.size}px`,
		};
	}
});

const extraVNode = computed(() => {
	if (slots.extra) {
		return slots
			.extra?.({})
			.filter((n: any) => n.type.toString() !== "Symbol(v-cmt)");
	} else {
		return [];
	}
});
</script>

<style lang="scss" scoped>
* {
	// 修复移动端模式下拓展失效的问题
	touch-action: none;

	box-sizing: border-box;

	// 按钮大小
	--size: calc(v-bind("state.size") * 1px);

	// 默认调色(亮色)
	--background-color: rgba(255, 255, 255, 0.65);
	--color: rgba(30, 30, 30, 0.85);
	--box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
	--border-color: rgba(255, 255, 255, 0.4);

	// 悬浮样式(亮色)
	--hover-background-color: rgba(255, 255, 255, 0.95);
	--hover-box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14),
		0 2px 6px rgba(0, 0, 0, 0.1);
	--hover-border-color: rgba(255, 255, 255, 0.6);
	--hover-color: rgba(30, 30, 30, 1);

	// 暗色调色
	@media (prefers-color-scheme: dark) {
		--background-color: rgba(30, 30, 30, 0.65);
		--color: rgba(240, 240, 240, 0.9);
		--box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35);
		--border-color: rgba(255, 255, 255, 0.08);

		// 悬浮样式(暗色)
		--hover-background-color: rgba(40, 40, 40, 0.95);
		--hover-box-shadow: 0 8px 22px rgba(0, 0, 0, 0.65),
			0 3px 8px rgba(0, 0, 0, 0.45);
		--hover-border-color: rgba(255, 255, 255, 0.1);
		--hover-color: rgba(240, 240, 240, 1);
	}

	// 过渡时长
	--transition-duration: 0.5s;
}

.base-hover-button {
	position: fixed;
	display: flex;
	align-items: flex-end;
	user-select: none;
	line-height: 1;
	z-index: 1000;

	// 按钮基础样式
	@mixin base-button {
		// overflow: hidden;
		border-radius: 50%;
		background-color: var(--background-color);
		color: var(--color);
		border: 1px solid var(--border-color);
		box-shadow: var(--box-shadow);
		cursor: pointer;

		backdrop-filter: blur(12px) saturate(1.2);
		-webkit-backdrop-filter: blur(12px) saturate(1.2);

		transition: var(--transition-duration) ease;
		transition-property: background color transform box-shadow opacity border;

		&:hover {
			background: var(--hover-background-color);
			box-shadow: var(--hover-box-shadow);
			border-color: var(--hover-border-color);
			color: var(--hover-color);
			transition: var(--transition-duration) ease;
		}
	}

	// 按钮基础样式
	&__base-button {
		@include base-button;
	}

	// 主要按钮
	&__main-button {
		position: absolute;
		// inset: 0;
		width: var(--size);
		height: var(--size);

		/* 插槽内容尺寸 */
		& > * {
			width: 100%;
			height: 100%;
			transition: inherit;
		}

		&:hover {
			transition-delay: 0s;
		}
	}

	// 额外按钮区
	&__extra-wrapper {
		--gap: 8px;
		z-index: -1;

		display: flex;
		flex-direction: column;
		gap: var(--gap);

		position: absolute;
		bottom: 0; // 初始贴着主按钮
		padding-bottom: calc(var(--gap) + var(--size));
		pointer-events: none;

		transition: 0.5s ease 0.5s, pointer-events 0.5s linear 0.5s;

		/* 插槽内容尺寸 */
		& > .base-hover-button__extra-button {
			@include base-button;
			--delay-step: 0.03s;
			width: var(--size);
			height: var(--size);
			opacity: 0;
			transform: translateY(
					calc((var(--size) + var(--gap)) * (var(--total) - var(--i)))
				)
				scale(0.1);
			transition: 0.3s ease;
			transition-delay: calc(
				var(--delay-step) * (var(--total) - var(--i)) + 0.5s
			);
			pointer-events: auto;
		}
	}

	&:focus-within &__extra-wrapper,
	&:active &__extra-wrapper,
	&:hover &__extra-wrapper {
		pointer-events: auto;
		transition: 0.5s ease;

		& > .base-hover-button__extra-button {
			opacity: 1;
			transform: translateY(0) scale(1);
			transition: 0.3s ease;
			transition-delay: calc(var(--i) * var(--delay-step));
		}
	}
}
</style>
