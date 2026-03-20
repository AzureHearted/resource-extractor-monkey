<template>
	<teleport :to="teleportTo" v-if="modalEnable">
		<transition
			name="drag-modal"
			@after-leave="handleClosed"
			@after-appear="handelOpened"
			appear
		>
			<!-- f modal容器 -->
			<div
				v-show="modalShow"
				ref="modalDom"
				class="drag-modal__container"
				:style="[modalStyle, modalDragStyle]"
				:class="[modalClass]"
				tabindex="0"
			>
				<!-- !标题栏(可拖动块) -->
				<div
					ref="headerDom"
					@dblclick="toggleFullScreen"
					class="drag-modal__header"
					:style="[headerStyle]"
					:class="[headerClass]"
				>
					<!-- s header部分  -->
					<div class="drag-modal__header-left">
						<!-- s header插槽 -->
						<slot name="header"> {{ title }} </slot>
					</div>
					<div class="drag-modal__header-right" @click.stop>
						<!-- s 全屏切换按钮 -->
						<div
							class="header__button drag-modal__button-toggle-fullscreen"
							@click="toggleFullScreen"
						>
							<icon-material-symbols-fullscreen-rounded v-if="!isFullscreen" />
							<icon-material-symbols-close-fullscreen-rounded v-else />
						</div>
						<!-- s 关闭按钮 -->
						<div
							class="header__button drag-modal__button-close"
							@click="show = false"
						>
							<icon-ant-design-close />
						</div>
					</div>
				</div>
				<!-- !内容区 -->
				<BaseScrollbar class="drag-modal__body">
					<!-- *视口 -->
					<div :style="[bodyStyle]" :class="[bodyClass]">
						<!-- s 内容区域插槽(默认插槽) -->
						<slot></slot>
					</div>
				</BaseScrollbar>
				<!-- !底部 -->
				<div v-if="slots['footer']" class="drag-modal__footer">
					<!-- s 内容区域插槽 -->
					<slot name="footer"> </slot>
				</div>
				<!-- ?四个可拖拽边框和四个控制角 -->
				<div class="drag-modal-size-control">
					<!-- s 水平方向边框 -->
					<div
						class="drag-modal-border-horizon"
						v-if="
							!isFullscreen && (modalResize === 'both' || modalResize === 'h')
						"
					>
						<!-- w 左边框 -->
						<div
							draggable
							class="drag-modal-border drag-modal-border-left"
							@mousedown="dragLeftBorder"
						></div>
						<!-- w 右边框 -->
						<div
							draggable
							class="drag-modal-border drag-modal-border-right"
							@mousedown="dragRightBorder"
						></div>
					</div>
					<!-- s 垂直方向边框 -->
					<div
						class="drag-modal-border-vertical"
						v-if="
							!isFullscreen && (modalResize === 'both' || modalResize === 'v')
						"
					>
						<!-- w 上边框 -->
						<div
							draggable
							class="drag-modal-border drag-modal-border-top"
							@mousedown="dragTopBorder"
						></div>
						<!-- w 下边框 -->
						<div
							draggable
							class="drag-modal-border drag-modal-border-bottom"
							@mousedown="dragBottomBorder"
						></div>
					</div>
					<template v-if="!isFullscreen">
						<!-- j 左上角控制点 -->
						<div
							draggable
							class="drag-modal-corner drag-modal-corner-lt"
							@mousedown="dragLTCorner"
						></div>
						<!-- j 右上角控制点 -->
						<div
							draggable
							class="drag-modal-corner drag-modal-corner-rt"
							@mousedown="dragRTCorner"
						></div>
						<!-- j 右下角控制点 -->
						<div
							draggable
							class="drag-modal-corner drag-modal-corner-rb"
							@mousedown="dragRBCorner"
						></div>
						<!-- j 左下角控制点 -->
						<div
							draggable
							class="drag-modal-corner drag-modal-corner-lb"
							@mousedown="dragLBCorner"
						></div>
					</template>
				</div>
			</div>
		</transition>
	</teleport>
	<!-- ?默认可拖拽区域 -->
	<teleport :to="teleportTo">
		<div ref="dragZoneDom" class="base-drag-modal-zone"></div>
	</teleport>
</template>

<script setup lang="ts">
import { ref, watch, reactive, nextTick, onMounted, useSlots } from "vue";
import { useWindowSize, useElementBounding, useDraggable } from "@vueuse/core";
import type { HtmlHTMLAttributes, CSSProperties } from "vue";
import BaseScrollbar from "./base-scrollbar.vue";

const show = defineModel("show", { type: Boolean, default: false });
const slots = useSlots();

interface Props {
	title?: string; // s 标题
	initFullscreen?: boolean; // s 初始全屏？
	closeResetState?: boolean; // s 关闭后重置状态？
	teleportTo?: string; // s 指定传送的容器的css选择器
	defaultDragZoneMargin?: CSSProperties["margin"]; // s 默认可拖拽区域的
	modalResize?: "none" | "both" | "h" | "v"; // s 控制modal可改变大小的方向
	modalInitWidth?: number; // s modal 初始宽度
	modalInitHeight?: number; // s modal 初始高度
	modalMinWidth?: number; // s modal 最小宽度
	modalMinHeight?: number; // s modal 最小高度
	modalStyle?: HtmlHTMLAttributes["style"]; // s modal 的用户自定义样式
	modalClass?: HtmlHTMLAttributes["class"]; // s modal 的用户自定义class
	modalAspectRatio?: CSSProperties["aspectRatio"]; // s modal 的aspect-ratio
	modalOverflow?: CSSProperties["overflow"]; // s modal 的overflow
	modalPadding?: CSSProperties["padding"]; // s modal 的padding
	headerStyle?: HtmlHTMLAttributes["style"]; // s title 的用户自定义样式
	headerClass?: HtmlHTMLAttributes["class"]; // s title 的用户自定义class
	bodyStyle?: HtmlHTMLAttributes["style"]; // s body 的用户自定义样式
	bodyClass?: HtmlHTMLAttributes["class"]; // s body 的用户自定义class
	bodyOverflow?: CSSProperties["overflow"]; // s body 的overflow
}
const props = withDefaults(defineProps<Props>(), {
	title: "",
	teleportTo: "body",
	defaultDragZoneMargin: "0px",
	modalInitWidth: 350,
	modalInitHeight: 250,
	modalMinWidth: 200,
	modalMinHeight: 200,
	modalResize: "both",
	bodyOverflow: "hidden",
	modalStyle: "",
	headerStyle: "",
	bodyStyle: "",
});
const emits = defineEmits(["open", "closed"]);

// s 元素的引用
const dragZoneDom = ref<HTMLElement | null>(null);
const modalDom = ref<HTMLElement | null>(null);
const headerDom = ref<HTMLElement | null>(null);

const window = useWindowSize(); // s 响应式视口尺寸
const dragZoneBounding = useElementBounding(dragZoneDom); // s 可拖拽区域的尺寸位置信息
const modalBounding = useElementBounding(modalDom); // s modal的尺寸位置信息

// s 控制是否启用modal(即是否渲染框架)
const modalEnable = ref(false);
// s 控制是否显示modal
const modalShow = ref(false);

// f modal开启后的回调
function handelOpened() {
	emits("open");
}

// w 监听show -> 控制modal框架以及本体的显示
watch(show, (newVal) => {
	if (newVal) {
		// console.log("打开");
		// s 即时修改modalEnable
		modalEnable.value = newVal;
		// s 延时更改modalShow
		setTimeout(() => {
			modalShow.value = newVal;
		});
	} else {
		// console.log("关闭");
		// s 即时更改modalShow
		modalShow.value = newVal;
	}
});

// f modal关闭后的回调
function handleClosed() {
	nextTick(() => {
		modalEnable.value = false;
	});
	emits("closed");
	// 判断是否重置窗口状态
	if (props.closeResetState) {
		resetPosSize();
	}
}

//* 修复重新挂载后该显示不显示的bug
onMounted(() => {
	if (show.value) {
		show.value = false;
		nextTick(() => {
			show.value = true;
		});
	}
});

// s modal尺寸
const modalSize = reactive({
	width: props.modalInitWidth,
	height: props.modalInitHeight,
});

// s 初始位置
const initPosition = reactive({
	x: (window.width.value - props.modalInitWidth) / 2,
	y: (window.height.value - props.modalInitHeight) / 2,
});

// f 重置位置和尺寸
const resetPosSize = () => {
	modalSize.width = props.modalInitWidth;
	modalSize.height = props.modalMinHeight;
	modalPosition.value.x = (window.width.value - props.modalInitWidth) / 2;
	modalPosition.value.y = (window.height.value - props.modalInitHeight) / 2;
};

//* modal的可拖拽设置
const { style: modalDragStyle, position: modalPosition } = useDraggable(
	modalDom,
	{
		handle: headerDom,
		// preventDefault: true,
		stopPropagation: true,
		initialValue: initPosition,
		onMove() {
			dragZoneBounding.update();
			modalBounding.update();
			// ! 防止modal超出边界视口
			nextTick(() => {
				handleFix();
			});
		},
	},
);

// w 监视可拖拽区域的尺寸变化
onMounted(() => {
	watch([dragZoneBounding.width, dragZoneBounding.height], () => {
		if (show.value) {
			handleFix();
		}
	});
});

// f 修正函数
const handleFix = () => {
	// s 水平方向纠正
	if (modalSize.width > dragZoneBounding.width.value) {
		// s 溢出的处理方式
		const newX = dragZoneBounding.x.value,
			newWidth = dragZoneBounding.width.value;
		modalPosition.value.x = newX;
		modalSize.width = newWidth;
	} else {
		// s 没有溢出的处理方式
		if (modalBounding.right.value > dragZoneBounding.right.value) {
			modalPosition.value.x =
				dragZoneBounding.right.value - modalBounding.width.value;
		}
		if (modalBounding.left.value < dragZoneBounding.left.value) {
			modalPosition.value.x = dragZoneBounding.left.value;
		}
	}

	// s 垂直方向纠正
	if (modalSize.height > dragZoneBounding.height.value) {
		// s 溢出的处理方式
		const newY = dragZoneBounding.y.value,
			newHeight = dragZoneBounding.height.value;
		modalPosition.value.x = newY;
		modalSize.width = newHeight;
	} else {
		// s 没有溢出的处理方式
		if (modalBounding.bottom.value > dragZoneBounding.bottom.value) {
			modalPosition.value.y =
				dragZoneBounding.bottom.value - modalBounding.height.value;
		}
		if (modalBounding.top.value < dragZoneBounding.top.value) {
			modalPosition.value.y = dragZoneBounding.top.value;
		}
	}
};

// ! 边框拖拽逻辑
// f 左边框拖拽
function dragLeftBorder(e: MouseEvent) {
	// s 判断是否可以修改"水平"方向尺寸
	if (props.modalResize !== "both" && props.modalResize !== "h") {
		return;
	}
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度和left
	const startModalWidth = modalBounding.width.value;
	const startModalLeft = modalBounding.left.value;
	const { clientX: startX } = e; // s 起始x坐标
	// console.log("右边框拖拽", e);
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX } = e;
		const deltaX = nowX - startX;
		if (
			startModalLeft + deltaX >= dragZoneBounding.left.value &&
			startModalWidth - deltaX > props.modalMinWidth
		) {
			modalPosition.value.x = startModalLeft + deltaX;
			modalSize.width = startModalWidth - deltaX;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 上边框拖拽
function dragTopBorder(e: MouseEvent) {
	// s 判断是否可以修改"垂直"方向尺寸
	if (props.modalResize !== "both" && props.modalResize !== "v") {
		return;
	}
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始高度和top
	const startModalHeight = modalBounding.height.value;
	const startModalTop = modalBounding.top.value;
	const { clientY: startY } = e; // s 起始x坐标
	// console.log("右边框拖拽", e);
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientY: nowY } = e;
		const deltaY = nowY - startY;
		if (
			startModalTop + deltaY >= dragZoneBounding.left.value &&
			startModalHeight - deltaY > props.modalMinHeight
		) {
			modalPosition.value.y = startModalTop + deltaY;
			modalSize.height = startModalHeight - deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 右边框拖拽
function dragRightBorder(e: MouseEvent) {
	// s 判断是否可以修改"水平"方向尺寸
	if (props.modalResize !== "both" && props.modalResize !== "h") {
		return;
	}
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度和right
	const startModalWidth = modalBounding.width.value;
	const startModalRight = modalBounding.right.value;
	const { clientX: startX } = e; // s 起始x坐标
	// console.log("右边框拖拽", e);
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX } = e;
		const deltaX = nowX - startX;
		if (
			startModalRight + deltaX <= dragZoneBounding.right.value &&
			startModalWidth + deltaX > props.modalMinWidth
		) {
			modalSize.width = startModalWidth + deltaX;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 下边框拖拽
function dragBottomBorder(e: MouseEvent) {
	// s 判断是否可以修改"垂直"方向尺寸
	if (props.modalResize !== "both" && props.modalResize !== "v") {
		return;
	}
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始高度和bottom
	const startModalHeight = modalBounding.height.value;
	const startModalBottom = modalBounding.bottom.value;
	const { clientY: startY } = e; // s 起始Y坐标
	// console.log("下边框拖拽", e);
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientY: nowY } = e;
		const deltaY = nowY - startY;
		if (
			startModalBottom + deltaY <= dragZoneBounding.bottom.value &&
			startModalHeight + deltaY > props.modalMinHeight
		) {
			modalSize.height = startModalHeight + deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}

// ! 角落拖拽逻辑
// f 左上角控制点拖拽
function dragLTCorner(e: MouseEvent) {
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度、高度和left、bottom
	const startModalWidth = modalBounding.width.value;
	const startModalHeight = modalBounding.height.value;
	const startModalLeft = modalBounding.left.value;
	const startModalTop = modalBounding.top.value;
	const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX, clientY: nowY } = e;
		const deltaX = nowX - startX;
		const deltaY = nowY - startY;
		// s 判断水平方向
		if (
			startModalLeft + deltaX >= dragZoneBounding.left.value &&
			startModalWidth - deltaX > props.modalMinWidth &&
			(props.modalResize === "both" || props.modalResize === "h")
		) {
			modalPosition.value.x = startModalLeft + deltaX;
			modalSize.width = startModalWidth - deltaX;
		}
		// s 判断垂直方向
		if (
			startModalTop + deltaY >= dragZoneBounding.top.value &&
			startModalHeight - deltaY > props.modalMinHeight &&
			(props.modalResize === "both" || props.modalResize === "v")
		) {
			modalPosition.value.y = startModalTop + deltaY;
			modalSize.height = startModalHeight - deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 右上角控制点拖拽
function dragRTCorner(e: MouseEvent) {
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度、高度和right、top
	const startModalWidth = modalBounding.width.value;
	const startModalHeight = modalBounding.height.value;
	const startModalRight = modalBounding.right.value;
	const startModalTop = modalBounding.top.value;
	const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX, clientY: nowY } = e;
		const deltaX = nowX - startX;
		const deltaY = nowY - startY;
		// s 判断水平方向
		if (
			startModalRight + deltaX <= dragZoneBounding.right.value &&
			startModalWidth + deltaX > props.modalMinWidth &&
			(props.modalResize === "both" || props.modalResize === "h")
		) {
			modalSize.width = startModalWidth + deltaX;
		}
		// s 判断垂直方向
		if (
			startModalTop + deltaY >= dragZoneBounding.top.value &&
			startModalHeight - deltaY > props.modalMinHeight &&
			(props.modalResize === "both" || props.modalResize === "v")
		) {
			modalPosition.value.y = startModalTop + deltaY;
			modalSize.height = startModalHeight - deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 右下角控制点拖拽
function dragRBCorner(e: MouseEvent) {
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度、高度和right、bottom
	const startModalWidth = modalBounding.width.value;
	const startModalHeight = modalBounding.height.value;
	const startModalRight = modalBounding.right.value;
	const startModalBottom = modalBounding.bottom.value;
	const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX, clientY: nowY } = e;
		const deltaX = nowX - startX;
		const deltaY = nowY - startY;
		// s 判断水平方向
		if (
			startModalRight + deltaX <= dragZoneBounding.right.value &&
			startModalWidth + deltaX > props.modalMinWidth &&
			(props.modalResize === "both" || props.modalResize === "h")
		) {
			modalSize.width = startModalWidth + deltaX;
		}
		// s 判断垂直方向
		if (
			startModalBottom + deltaY <= dragZoneBounding.bottom.value &&
			startModalHeight + deltaY > props.modalMinHeight &&
			(props.modalResize === "both" || props.modalResize === "v")
		) {
			modalSize.height = startModalHeight + deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}
// f 左下角控制点拖拽
function dragLBCorner(e: MouseEvent) {
	dragZoneBounding.update();
	modalBounding.update();
	// s modal起始宽度、高度和left、bottom
	const startModalWidth = modalBounding.width.value;
	const startModalHeight = modalBounding.height.value;
	const startModalLeft = modalBounding.left.value;
	const startModalBottom = modalBounding.bottom.value;
	const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
	// s 移动
	document.addEventListener("mousemove", handleMove, { passive: false });
	function handleMove(e: MouseEvent) {
		const { clientX: nowX, clientY: nowY } = e;
		const deltaX = nowX - startX;
		const deltaY = nowY - startY;
		// s 判断水平方向
		if (
			startModalLeft + deltaX >= dragZoneBounding.left.value &&
			startModalWidth - deltaX > props.modalMinWidth &&
			(props.modalResize === "both" || props.modalResize === "h")
		) {
			modalPosition.value.x = startModalLeft + deltaX;
			modalSize.width = startModalWidth - deltaX;
		}
		// s 判断垂直方向
		if (
			startModalBottom + deltaY <= dragZoneBounding.bottom.value &&
			startModalHeight + deltaY > props.modalMinHeight &&
			(props.modalResize === "both" || props.modalResize === "v")
		) {
			modalSize.height = startModalHeight + deltaY;
		}
	}
	// s 松开
	document.addEventListener("mouseup", handleDrop, { passive: false });
	function handleDrop() {
		// console.log("松开");
		document.removeEventListener("mousemove", handleMove);
		document.removeEventListener("mouseup", handleDrop);
	}
}

// s 是否全屏的标识符
const isFullscreen = ref<Boolean>(false);
// s 记录全屏前的尺寸和位置
const beforePosAndSize = reactive({
	width: 0,
	height: 0,
	x: 0,
	y: 0,
});
onMounted(() => {
	if (props.initFullscreen) {
		toggleFullScreen();
	}
});
// f 双击header进行全屏和还原切换
const toggleFullScreen = () => {
	isFullscreen.value = !isFullscreen.value;
	// console.log("双击", isFullscreen.value);
	if (isFullscreen.value) {
		// s 全屏前先记录当前位置和尺寸
		beforePosAndSize.x = modalPosition.value.x;
		beforePosAndSize.y = modalPosition.value.y;
		beforePosAndSize.width = modalSize.width;
		beforePosAndSize.height = modalSize.height;
		// s 然后设置全屏位置
		modalPosition.value.x = dragZoneBounding.x.value;
		modalPosition.value.y = dragZoneBounding.y.value;
		modalSize.width = dragZoneBounding.width.value;
		modalSize.height = dragZoneBounding.height.value;
	} else {
		// s 还原到全屏前的位置和尺寸
		modalPosition.value.x = beforePosAndSize.x;
		modalPosition.value.y = beforePosAndSize.y;
		modalSize.width = beforePosAndSize.width;
		modalSize.height = beforePosAndSize.height;
	}
};
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
	border: 0;
}
// s 窗口容器
.drag-modal__container {
	position: fixed;

	width: v-bind("modalSize.width+'px'");
	height: v-bind("modalSize.height+'px'");

	// border-radius: 4px;

	background: rgba(255, 255, 255, 0.5);
	backdrop-filter: blur(5px);

	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);

	display: flex;
	flex-flow: column nowrap;

	&:focus-visible {
		outline: unset;
	}

	z-index: 2000;

	// s header
	.drag-modal__header {
		position: relative;
		height: 30px;

		touch-action: none; // ! 必须设为none否则useDraggable不能正常使用
		/* 禁止选中文字 */
		user-select: none;
		/* 禁止图文拖拽 */
		-webkit-user-drag: none;

		font-size: 18px;
		// padding: 4px 8px;

		transition: 0.5s ease-in-out;
		background: rgba(255, 255, 255, 0.4);
		// background: wheat;

		&:hover {
			background: rgb(216, 216, 216);
		}

		display: flex;
		flex-flow: row nowrap;
		// s header左侧
		.drag-modal__header-left {
			flex: auto;
			display: flex;
			flex-flow: row nowrap;
			align-items: center;
			padding: 2px 4px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		// s header右侧
		.drag-modal__header-right {
			margin-left: auto;
			display: flex;
			flex-flow: row nowrap;
			width: fit-content;
			height: 100%;

			touch-action: auto;

			// s header中的button
			.header__button {
				aspect-ratio: 1;
				width: auto;
				height: 100%;
				display: flex;
				justify-content: center;
				align-items: center;
				transition: 0.5s ease;
			}
			// s 默认按钮悬浮样式
			.header__button:hover {
				background: rgb(168, 168, 168);
			}
			// s 关闭按钮(悬浮样式)
			.drag-modal__button-close:hover {
				background: rgb(244, 67, 54);
				color: white;
			}
		}
	}
	// s 内容区
	.drag-modal__body {
		position: relative;
		padding: 4px;
		overflow: hidden;
	}

	// s 底部
	.drag-modal__footer {
		position: relative;
		background: rgba(255, 255, 255, 0.3);
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		font-size: 16px;
		padding: 4px 8px;
	}

	// ! modal控制边框和角
	.drag-modal-size-control {
		$weight: 4px;
		$length: 100%;

		/* 禁止选中文字 */
		user-select: none !important;
		/* 禁止图文拖拽 */
		-webkit-user-drag: none !important;
		overflow: hidden !important;

		// w 四个可拖拽边框
		.drag-modal-border {
			box-sizing: border-box;
			position: absolute !important;
			margin: auto !important;
			opacity: 0;
			// background-color: green !important;
			// background-color: transparent !important;
			transition: 0.5s ease;

			&:active,
			&:hover {
				opacity: 1;
				background-color: yellowgreen !important;
			}

			// w 左边框
			&.drag-modal-border-left {
				position: relative;
				left: 0 !important;
				top: 0 !important;
				bottom: 0 !important;
				width: $weight !important;
				height: $length !important;
				cursor: ew-resize !important;
			}
			// w 右边框
			&.drag-modal-border-right {
				right: 0 !important;
				top: 0 !important;
				bottom: 0 !important;
				width: $weight !important;
				height: $length !important;
				cursor: ew-resize !important;
			}
			// w 上边框
			&.drag-modal-border-top {
				top: 0 !important;
				left: 0 !important;
				right: 0 !important;
				width: $length !important;
				height: $weight !important;
				cursor: ns-resize !important;
			}

			// w 下边框
			&.drag-modal-border-bottom {
				bottom: 0 !important;
				left: 0 !important;
				right: 0 !important;
				width: $length !important;
				height: $weight !important;
				cursor: ns-resize !important;
			}
		}
		// j 四个可拖拽角落
		.drag-modal-corner {
			box-sizing: border-box;
			position: absolute !important;
			$width: calc(2 * $weight);
			$height: calc(2 * $weight);
			width: $width !important;
			height: $height !important;
			// background-color: blueviolet;
			box-shadow: unset;
			opacity: 0;
			transition: 0.5s ease;

			&:active,
			&:hover {
				opacity: 1;
				background-color: yellowgreen !important;
			}

			// j 左上角
			&.drag-modal-corner-lt {
				left: 0 !important;
				top: 0 !important;
				cursor: se-resize !important;
			}
			// j 右上角
			&.drag-modal-corner-rt {
				right: 0 !important;
				top: 0 !important;
				cursor: sw-resize !important;
			}

			// j 右下角
			&.drag-modal-corner-rb {
				right: 0 !important;
				bottom: 0 !important;
				cursor: se-resize !important;
			}

			// j 左下角
			&.drag-modal-corner-lb {
				left: 0 !important;
				bottom: 0 !important;
				cursor: sw-resize !important;
			}
		}
	}
}
// s 默认可拖拽区域样式
.base-drag-modal-zone {
	position: absolute;
	margin: auto;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;

	margin: v-bind("defaultDragZoneMargin");

	pointer-events: none;
}
</style>

<style lang="scss">
//? transition效果
// s	默认淡出淡入
.drag-modal-enter-active,
.drag-modal-leave-active {
	transition: 0.5s ease !important;
}
.drag-modal-enter-from,
.drag-modal-leave-to {
	opacity: 0;
}
</style>
