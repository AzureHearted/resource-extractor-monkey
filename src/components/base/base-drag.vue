<template>
	<div class="base-drag__layout" v-if="showLayout">
		<transition
			@before-enter="handleBeforeEnter"
			@enter="handleEnter"
			@after-enter="handleAfterEnter"
			@before-leave="handleBeforeLeave"
			@after-leave="handleAfterLeave"
			appear
		>
			<div
				v-if="showContainer"
				:data-is-dragging="isDragging"
				class="base-drag__container"
				ref="containerDOM"
				:style="[posStyle, sizeStyle]"
			>
				<!-- s 主要内容区 -->
				<slot> </slot>
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import {
	ref,
	reactive,
	computed,
	watch,
	onMounted,
	onUnmounted,
	onActivated,
	onDeactivated,
	nextTick,
} from "vue";
import type { ComputedRef, TeleportProps } from "vue";
import { useDraggable, useElementBounding, useWindowSize } from "@vueuse/core";
import type { Position, UseDraggableReturn } from "@vueuse/core";
import type { HTMLAttributes } from "vue";

const props = withDefaults(
	defineProps<{
		closeResetState?: boolean; // s 关闭后重置状态？
		initPercentY?: number; // s 初始垂直位置百分比(相对窗口)
		initPercentX?: number; // s 初始水平位置百分比(相对窗口)
		initSize?: { width: number; height: number }; // s 初始尺寸
		minWidth?: number; // 最小宽度
		minHeight?: number; // 最小高度
	}>(),
	{
		initPercentX: 0.5,
		initPercentY: 0.5,
		minWidth: 100,
		minHeight: 100,
	}
);
const emits = defineEmits(["open", "closed", "beforeClose"]);

// s 容器DOM
const containerDOM = ref<HTMLElement | null>(null);
// s 位置
let position: UseDraggableReturn["position"];
// j dialog位置样式
let posStyle: ComputedRef<HTMLAttributes["style"]>;
// s 容器边界信息
const bounding = useElementBounding(containerDOM);
// s 容器尺寸
let size:
	| {
			width: number;
			height: number;
	  }
	| undefined;
// j dialog尺寸样式
let sizeStyle: ComputedRef<HTMLAttributes["style"]>;

// s window尺寸
const winSize = useWindowSize(); // s 响应式视口尺寸

// w 监视可拖拽区域的尺寸变化
watch([() => winSize.width.value, () => winSize.height.value], () => {
	if (show.value) {
		nextTick(() => {
			handleFixPosSize();
		});
	}
});

// j 是否拖拽中
let isDragging: ComputedRef<boolean>;

// s 标记是否已经初始化了
const isInit = ref(false);
// f 初始化函数
function init() {
	const {
		style,
		position: pos,
		isDragging: dragging,
	} = useDraggable(containerDOM, {
		handle: containerDOM,
		preventDefault: true,
		stopPropagation: true,
		initialValue: () => {
			const { x, y } = calcPos({
				width: containerDOM.value
					? containerDOM.value.clientWidth
					: props.initSize?.width,
				height: containerDOM.value
					? containerDOM.value.clientHeight
					: props.initSize?.height,
				percentX: props.initPercentX,
				percentY: props.initPercentY,
			});
			console.log({ x, y });
			return { x, y };
		},
		onMove() {
			bounding.update();
			// ! 防止modal超出边界视口
			nextTick(() => {
				handleFixPosSize();
			});
		},
	});
	// ! 记录响应式数据
	posStyle = style;
	position = pos;
	isDragging = dragging;
}

// w 监听dialogDOM是否获取到
watch(containerDOM, (dom) => {
	// console.log("containerDOM", dom);
	if (dom) {
		if (!isInit.value) {
			// ! 进行初始化
			isInit.value = true;
			if (!props.initSize) {
				size = reactive({
					width: dom.clientWidth,
					height: dom.clientHeight,
				});
			} else {
				size = reactive({
					width: props.initSize.width,
					height: props.initSize.height,
				});
			}

			// w 监听dialog尺寸变化
			watch([() => size?.width, () => size?.height], () => {
				if (show.value) {
					nextTick(() => {
						handleFixPosSize();
					});
				}
			});

			sizeStyle = computed(() => {
				return {
					width: `${size?.width}px`,
					height: `${size?.height}px`,
				};
			});

			// s 执行初始化
			init();
			// s 刷新显示状态
			showContainer.value = false;
			nextTick(() => {
				showContainer.value = true;
			});
		} else {
			// ! 已经初始化过了(判断是否重置位置和尺寸)
			if (props.closeResetState) {
				position.value = calcPos({
					width: containerDOM.value
						? containerDOM.value.clientWidth
						: props.initSize?.width,
					height: containerDOM.value
						? containerDOM.value.clientHeight
						: props.initSize?.height,
					percentX: props.initPercentX,
					percentY: props.initPercentY,
				});

				if (!props.initSize) {
					size = reactive({
						width: dom.clientWidth,
						height: dom.clientHeight,
					});
				} else {
					size = reactive({
						width: props.initSize.width,
						height: props.initSize.height,
					});
				}
			}
		}
	}
});

// s 组件是否已挂载
const isMounted = ref(false);
// s 组件是否被冻结
const isFreeze = ref(false);

// ! 是否显示dialog
const show = defineModel("show", { type: Boolean, default: true });
// s 显示容器
const showContainer = ref(false);
// s 是否显示框架
const showLayout = ref(false);

// w 监听是否显示dialog
watch(
	() => show.value,
	(isShow) => {
		if (isShow) {
			// s 先渲染框架
			showLayout.value = true;
			// s 然后异步渲染dialog
			setTimeout(() => {
				showContainer.value = true;
			});
		} else {
			showContainer.value = false;
		}
	}
);

//* 修复重新挂载后该显示不显示的bug
onMounted(() => {
	if (show.value) {
		show.value = false;
		nextTick(() => {
			show.value = true;
		});
	}
});

// ! 组件挂载时
onMounted(() => {
	console.log("onMounted");
	isMounted.value = true;
});

// ! 组件卸载时
onUnmounted(() => {
	isMounted.value = false;
});

// ! 组件被激活时
onActivated(() => {
	isFreeze.value = false;
	// ! 被冻结时进行显示/隐藏
	showContainer.value = show.value;
});

// ! 组件被冻结时
onDeactivated(() => {
	isFreeze.value = true;
	// ! 被冻结时进行隐藏
	showContainer.value = false;
});

// f dialog关闭前的回调
function handleBeforeLeave() {
	emits("beforeClose");
}
// f dialog关闭后的回调
function handleAfterLeave() {
	emits("closed");
}

// f dialog进入前的回调
function handleBeforeEnter() {
	// console.log(
	// 	"before-enter",
	// 	containerDOM.value?.clientWidth,
	// 	containerDOM.value?.clientHeight
	// );
}

// f dialog进入时的回调
function handleEnter() {
	// console.log(
	// 	"enter",
	// 	containerDOM.value?.clientWidth,
	// 	containerDOM.value?.clientHeight,
	// 	winSize.width.value,
	// 	winSize.height.value
	// );
}

// f dialog进入后的回调
function handleAfterEnter() {
	emits("open");
	// console.log(
	// 	"after-enter",
	// 	containerDOM.value?.clientWidth,
	// 	containerDOM.value?.clientHeight
	// );
	nextTick(() => {
		handleFixPosSize();
	});
}

interface CalcPosOption {
	width: number;
	height: number;
	percentY: number; // 垂直方向百分比(0~1)
	percentX: number; // 水平方向百分比(0~1)
}
// f 计算位置
function calcPos(options: Partial<CalcPosOption>): Position {
	const defaultOptions: CalcPosOption = {
		width: 0,
		height: 0,
		percentY: 0.5,
		percentX: 0.5,
	};
	const { width, height, percentY, percentX } = {
		...defaultOptions,
		...options,
	};
	const [x, y] = [
		(winSize.width.value - width) * percentX,
		(winSize.height.value - height) * percentY,
	];
	return { x, y };
}

// f 修正位置&尺寸
function handleFixPosSize() {
	if (!position || !size || !containerDOM.value) return;
	// s 水平方向纠正
	if (size.width > winSize.width.value) {
		// s 溢出的处理方式
		const newX = 0,
			newWidth = winSize.width.value;
		position.value.x = newX;
		size.width = newWidth;
	} else {
		// s 没有溢出的处理方式
		if (bounding.right.value > winSize.width.value) {
			position.value.x = winSize.width.value - bounding.width.value;
		}
		if (bounding.left.value < 0) {
			position.value.x = 0;
		}
	}

	// s 垂直方向纠正
	if (size.height > winSize.height.value) {
		// s 溢出的处理方式
		const newY = 0,
			newHeight = winSize.height.value;
		position.value.x = newY;
		size.height = newHeight;
	} else {
		// s 没有溢出的处理方式

		if (bounding.bottom.value > winSize.height.value) {
			position.value.y = winSize.height.value - bounding.height.value;
		}
		if (bounding.top.value < 0) {
			position.value.y = 0;
		}
	}
}
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}
// $radius: 4px;
.base-drag__container {
	position: fixed;
	// max-width: 100vw;
	// max-height: 100vh;
	min-width: v-bind("minWidth+'px'");
	min-height: v-bind("minHeight+'px'");

	margin: unset;
	padding: unset;
	border: unset;

	background: rgba(255, 255, 255, 0.2);
	backdrop-filter: blur(10px);
	box-shadow: 0 0 8px 0.5px rgba(0, 0, 0, 0.6),
		inset 0 0 10px 8px rgba(128, 128, 128, 0.6);

	// border-radius: 4px;
	z-index: 2000;

	display: flex;
	flex-flow: column nowrap;

	&[data-is-dragging="false"] {
		transition: 0.5s ease;
	}

	&[data-show="false"] {
		opacity: 0 !important;
	}
}

// s 拖拽条容器
.base-drag__header {
	position: relative;
	height: 10px;
	// background: skyblue;
	background: rgba(255, 255, 255, 0.5);

	// border-top-left-radius: $radius;
	// border-top-right-radius: $radius;

	touch-action: none; // ! 必须设为none否则useDraggable不能正常使用
	/* 禁止选中文字 */
	user-select: none;
	/* 禁止图文拖拽 */
	-webkit-user-drag: none;
}
// s (默认)拖拽条
.base-drag__drag-bar-default {
	width: 100%;
	height: 100%;
	// border-top-left-radius: $radius;
	// border-top-right-radius: $radius;
	transition: 0.5s ease;

	&:hover,
	&:active {
		background: rgba(135, 207, 235, 0.8);
	}

	&::after {
		content: "";
		position: absolute;
		height: 1px;
		width: 80%;
		top: 40%;
		left: 50%;
		transform: translate(-50%, 50%);
		background: black;
	}
}

// s 按钮容器
.base-dock__button-wrap {
	position: relative;
	display: flex;
	align-items: center;

	// & > :nth-child(n) {
	// 	border-radius: 0;
	// }
	// & > :first-child {
	// 	border-bottom-left-radius: $radius;
	// }
	// & > :last-child {
	// 	border-bottom-right-radius: $radius;
	// }
}

// s 关闭按钮
.base-dock__close-button {
	height: 100%;
	aspect-ratio: 1;
	display: flex;
	background: red;
}

//? transition效果
// s	默认淡出淡入
.v-enter-active,
.v-leave-active {
	transition: 0.5s ease;
}
.v-enter-from,
.v-leave-to {
	// position: fixed;
	opacity: 0 !important;
	// top: 100% !important;
}
</style>
