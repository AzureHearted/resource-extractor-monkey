<template>
	<div
		ref="containerDOM"
		class="base-scrollbar_container"
		:data-disable="disable"
	>
		<!-- s 视口区滚动区 -->
		<div
			ref="viewportDOM"
			class="base-scrollbar__viewport"
			tabindex="0"
			:style="[viewportStyle]"
		>
			<!-- s 插槽出口 (内容) -->
			<slot></slot>
		</div>
		<!-- t 滚动条 -->
		<div
			v-show="!disable"
			:data-show-vertical-scrollbar="verticalScrollbarVisible"
			:data-show-horizontal-scrollbar="horizontalScrollbarVisible"
		>
			<teleport :disabled="!teleportTo" :to="teleportTo ? teleportTo : 'body'">
				<!-- t 垂直滚动条 -->
				<div
					ref="verticalTrack"
					class="base-scrollbar__track track__vertical"
					:class="{
						'is-dragging': state.vertical.isDragging,
					}"
					@click="onClickTrack('vertical', $event)"
				>
					<transition name="scrollbar">
						<div
							ref="verticalThumb"
							class="base-scrollbar__thumb thumb__vertical"
							:class="{
								'arrived-top':
									showArrivedIndicator &&
									arrivedState.top &&
									state.vertical.lengthPercent < 1,
								'arrived-bottom':
									showArrivedIndicator &&
									arrivedState.bottom &&
									state.vertical.lengthPercent < 1,
							}"
							@mousedown.stop
							@mouseup.stop
							@click.stop
							@touchend.stop
							:style="{
								height: `${state.vertical.lengthPercent * 100}%`,
								transform: `translateY(${verticalThumbTop}px)`,
							}"
						>
							<!-- thumb 内容区 -->
							<div
								ref="verticalThumbContent"
								class="base-scrollbar__thumb__content"
								:style="[calcVerticalThumbContentStyle]"
							>
								<!-- 内容插槽 -->
								<slot name="vertical-thumb-content"> </slot>
							</div>
						</div>
					</transition>
				</div>
				<!-- t 水平滚动条 -->
				<div
					ref="horizontalTrack"
					class="base-scrollbar__track track__horizontal"
					:class="{
						'is-dragging': state.horizontal.isDragging,
					}"
					@click="onClickTrack('horizontal', $event)"
				>
					<transition name="scrollbar">
						<div
							ref="horizontalThumb"
							class="base-scrollbar__thumb thumb__horizontal"
							:class="{
								'arrived-left':
									showArrivedIndicator &&
									arrivedState.left &&
									state.horizontal.lengthPercent < 1,
								'arrived-right':
									showArrivedIndicator &&
									arrivedState.right &&
									state.horizontal.lengthPercent < 1,
							}"
							@mousedown.stop
							@mouseup.stop
							@click.stop
							@touchend.stop
							:style="{
								width: `${state.horizontal.lengthPercent * 100}%`,
								transform: `translateX(${horizontalThumbLeft}px)`,
							}"
						>
							<!-- thumb 内容区 -->
							<div
								ref="horizontalThumbContent"
								class="base-scrollbar__thumb__content"
								:style="[horizontalThumbContentStyle]"
							>
								<!-- 内容插槽 -->
								<slot name="horizontal-thumb-content"> </slot>
							</div>
						</div>
					</transition>
				</div>
			</teleport>
		</div>
		<!-- t 回到顶部按钮 -->
		<transition name="back-top">
			<div
				class="base-scrollbar__back-top"
				v-show="bakctopShow && showBackTopButton"
				@click="backToTop"
			>
				<i class="back-top__icon">
					<svg
						data-v-e6ff9537=""
						viewBox="0 0 1024 1024"
						width="1.2em"
						height="1.2em"
					>
						<path fill="currentColor" d="M512 320L192 704h639.936z"></path>
					</svg>
				</i>
			</div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import {
	reactive,
	computed,
	onActivated,
	onDeactivated,
	useTemplateRef,
	onUnmounted,
	shallowRef,
	shallowReactive,
	nextTick,
	onMounted,
	watch,
} from "vue";
import type { CSSProperties, HTMLAttributes, TeleportProps } from "vue";

// ? 引入vueuse的方法
import {
	useScroll,
	useElementBounding,
	useDraggable,
	useResizeObserver,
	useMutationObserver,
} from "@vueuse/core";

// ? 告诉 Vue 不要自动将 attrs（包括 style, class, data-*等）应用到根元素
defineOptions({
	name: "base-scrollbar",
});

// 定义props
const props = withDefaults(
	defineProps<{
		/** value 绑定值，可以是百分比或像素值，取决于 model-mode @default 'px' */
		valueMode?: "percent" | "px";
		/** 禁用虚拟滚动条（改用原生滚动条） @default false */
		disable?: boolean;
		/** 垂直方向的 overflow @default "auto" */
		overflowY?: CSSProperties["overflowY"];
		/** 水平方向的 overflow @default "auto" */
		overflowX?: CSSProperties["overflowX"];
		/** 显示滚动条 @default true */
		showScrollbar?: boolean;
		/** 显示回到顶部按钮？  @default false */
		showBackTopButton?: boolean;
		/** 显示回到顶部的滚动行为 @default "auto" */
		backToTopBehavior?: ScrollBehavior;
		/** 滚动条的track尺寸（宽度） @default 12 */
		trackSize?: number;
		/** 滚动条的track的padding尺寸（宽度）会影响thumb的视觉尺寸 @default 2 */
		thumbPadding?: number;
		/** 鼠标悬浮在track上时padding尺寸（宽度）会影响thumb的视觉尺寸 @default 0 */
		hoverThumbPadding?: number;
		/** 滚动条偏移量 [ `垂直滚动条的横向偏移`px , `水平滚动条的纵向偏移`px ] @default [1,1] */
		offset?: [number, number];
		/** 将滚动条传送到指定元素 @default false */
		teleportTo?: TeleportProps["to"] | false;
		/** 视口样式，为防止计算出错请勿设置 padding 和 margin  */
		viewportStyle?: HTMLAttributes["style"];
		/** 显示抵达指示器 @default false */
		showArrivedIndicator?: boolean;
	}>(),
	{
		valueMode: "px",
		overflowX: "auto",
		overflowY: "auto",
		showScrollbar: true,
		showBackTopButton: false,
		backToTopBehavior: "auto",
		trackSize: 12,
		thumbPadding: 2,
		hoverThumbPadding: 0,
		offset: () => [1, 1],
		teleportTo: false,
	}
);

// s 滚动条滚动位置
const modelValueScrollY = defineModel<number>("scrollY", { default: 0 });
const modelValueScrollX = defineModel<number>("scrollX", { default: 0 });

// w 初始化滚动条位置
onMounted(async () => {
	await nextTick();
	if (props.valueMode === "percent") {
		scrollToPercent({ y: modelValueScrollY.value, x: modelValueScrollX.value });
	} else {
		scrollTo({ y: modelValueScrollY.value, x: modelValueScrollX.value });
	}
});

// w 监听model-value变化
watch(
	[() => modelValueScrollY.value, () => modelValueScrollX.value],
	([newY, newX], [oldY, oldX]) => {
		if (
			!state.show ||
			isScrolling.value ||
			state.vertical.isDragging ||
			state.horizontal.isDragging
		)
			return; // console.log('内部：触发滚动位置变化')
		// console.log('外部：触发滚动位置发生')
		let y = newY !== oldY ? newY : undefined;
		let x = newX !== oldX ? newX : undefined;

		if (props.valueMode === "percent") {
			scrollToPercent({ y, x });
		} else {
			scrollTo({ y, x });
		}
	}
);

// s 组件容器
const containerDOM = useTemplateRef("containerDOM");
const containerInfo = shallowReactive({
	width: 0,
	height: 0,
	left: 0,
	top: 0,
	right: 0,
	bottom: 0,
	x: 0,
	y: 0,
});

useResizeObserver(containerDOM, (entries) => {
	const entry = entries[0];
	const { width, height, left, top, right, bottom, x, y } = entry.contentRect;
	containerInfo.width = width;
	containerInfo.height = height;
	containerInfo.left = left;
	containerInfo.top = top;
	containerInfo.right = right;
	containerInfo.bottom = bottom;
	containerInfo.x = x;
	containerInfo.y = y;
	// console.log("containerDOM尺寸变化", entries);
});

// s 视口容器
const viewportDOM = useTemplateRef("viewportDOM");
const viewportInfo = shallowReactive({
	width: 0,
	height: 0,
	left: 0,
	top: 0,
	right: 0,
	bottom: 0,
	x: 0,
	y: 0,
	scrollHeight: 0,
	scrollWidth: 0,
});

// ? 无论是视口尺寸变化还是内容区尺寸变化都需要更新滚动条
useResizeObserver(viewportDOM, (entries) => {
	if (freeze.value) return;

	const entry = entries[0];
	const { width, height, left, top, right, bottom, x, y } = entry.contentRect;
	viewportInfo.width = width;
	viewportInfo.height = height;
	viewportInfo.left = left;
	viewportInfo.top = top;
	viewportInfo.right = right;
	viewportInfo.bottom = bottom;
	viewportInfo.x = x;
	viewportInfo.y = y;
	viewportInfo.scrollHeight = entry.target.scrollHeight;
	viewportInfo.scrollWidth = entry.target.scrollWidth;

	scheduleUpdateThumb();

	// ? 发生滚动事件(因为有可能视口变化导致滚动位置变化)
	emits(
		"scroll",
		viewportScrollX.value,
		viewportScrollY.value,
		scrollPercent.value.x,
		scrollPercent.value.y
	);
	// ? 更新model-value
	modelValueScrollY.value =
		(props.valueMode === "percent"
			? scrollPercent.value.y
			: viewportScrollY.value) || modelValueScrollY.value;
	modelValueScrollX.value =
		(props.valueMode === "percent"
			? scrollPercent.value.x
			: viewportScrollX.value) || modelValueScrollY.value;
});

// s 滚动条状态数据
const state = reactive({
	show: true,
	isScrolling: false,
	vertical: {
		isDragging: false,
		lengthPercent: 0,
	},
	horizontal: {
		isDragging: false,
		lengthPercent: 0,
	},
});

// w 挂载时计算一次
onMounted(async () => {
	await nextTick();
	scheduleUpdateThumb();
});

// 监听视口的内 DOM 树的变更
const { stop: stopMutationObserver } = useMutationObserver(
	viewportDOM,
	(_mutations) => {
		if (freeze.value) return;
		scheduleUpdateThumb();
	},
	{
		childList: true,
		subtree: true,
		attributes: true,
	}
);
// 卸载组件时取消监听
onUnmounted(() => stopMutationObserver());

let scheduled = false;
function scheduleUpdateThumb() {
	if (scheduled) return;
	scheduled = true;
	requestAnimationFrame(() => {
		updateThumb();
		scheduled = false;
	});
}

// 更新函数
function updateThumb() {
	if (freeze.value) return;
	calcThumbSize(); //计算滚动条尺寸
	updateThumbPosition(); //计算滚动条位置
}

// ? 记录器: 用于记录冻结前的进度条百分比
const stateCache = {
	vertical: {
		trackLen: 0,
		lengthPercent: 0,
	},
	horizontal: {
		trackLen: 0,
		lengthPercent: 0,
	},
	viewportInfo: {
		scrollXPercent: 0,
		scrollYPercent: 0,
	},
};

// s 标记组件是否被冻结
const freeze = shallowRef(false);

// * 组件被冻结时
onDeactivated(() => {
	freeze.value = true;

	// 记录滚动信息
	let scrollYPercent =
		viewportScrollY.value / (viewportInfo.scrollHeight - viewportInfo.height);
	if (!scrollYPercent || scrollYPercent === Infinity) {
		scrollYPercent =
			verticalThumbTop.value / verticalTrackInfo.height.value || 0;
	}
	stateCache.viewportInfo.scrollYPercent = scrollYPercent;
	let scrollXPercent =
		viewportScrollX.value / (viewportInfo.scrollWidth - viewportInfo.width);
	if (!scrollXPercent || scrollXPercent === Infinity) {
		scrollXPercent =
			horizontalThumbLeft.value / horizontalTrackInfo.width.value || 0;
	}
	stateCache.viewportInfo.scrollXPercent = scrollXPercent;

	stateCache.vertical.lengthPercent = state.vertical.lengthPercent || 0;
	stateCache.vertical.trackLen = Math.floor(verticalTrackInfo.height.value);

	stateCache.horizontal.lengthPercent = state.horizontal.lengthPercent || 0;
	stateCache.horizontal.trackLen = Math.floor(horizontalTrackInfo.width.value);

	// console.log("冻结组件", stateCache);
});

// * 组件被解冻时
onActivated(async () => {
	await nextTick();
	if (!viewportDOM.value || !freeze.value) return;

	// 先尝试使用viewportInfo的信息进行计算
	let scrollY =
		stateCache.viewportInfo.scrollYPercent *
			(viewportInfo.scrollHeight - viewportInfo.height) || 0;
	let scrollX =
		stateCache.viewportInfo.scrollXPercent *
			(viewportInfo.scrollWidth - viewportInfo.width) || 0;

	// 如果是原生滚动条到这里就结束
	if (props.disable) {
		viewportScrollY.value = scrollY;
		viewportScrollX.value = scrollX;
		freeze.value = false;
		return;
	}

	if (!scrollY) {
		const { scrollHeight, clientHeight } = viewportDOM.value;
		const verticalTrackLen =
			verticalTrackDOM.value?.clientHeight || stateCache.vertical.trackLen;
		// track - 滚动条 的剩余长度
		const verticalRemainTrackLen =
			verticalTrackLen * (1 - stateCache.vertical.lengthPercent);
		const top = verticalRemainTrackLen * stateCache.viewportInfo.scrollYPercent;
		scrollY =
			top / (verticalRemainTrackLen / (scrollHeight - clientHeight)) || 0;
	}

	if (!scrollX) {
		const { scrollWidth, clientWidth } = viewportDOM.value;
		const horizontalLen =
			verticalTrackDOM.value?.clientWidth || stateCache.horizontal.trackLen;
		// track - 滚动条 的剩余长度
		const horizontalRemainTrackLen =
			horizontalLen * (1 - stateCache.horizontal.lengthPercent);
		const left =
			horizontalRemainTrackLen * stateCache.viewportInfo.scrollXPercent;
		scrollX =
			left / (horizontalRemainTrackLen / (scrollWidth - clientWidth)) || 0;
	}

	viewportScrollY.value = scrollY;
	viewportScrollX.value = scrollX;

	// console.log("解冻组件", stateCache);
	freeze.value = false;
});

// ? 定义事件
const emits = defineEmits<{
	scroll: [x: number, y: number, xPercent: number, yPercent: number];
}>();

// ? 可滚动对象
const {
	x: viewportScrollX,
	y: viewportScrollY,
	arrivedState,
	isScrolling,
} = useScroll(viewportDOM, {
	onScroll() {
		if (state.vertical.isDragging || state.horizontal.isDragging) return;
		if (freeze.value) return;
		calcThumbSize();
		updateThumbPosition();
		// ? 发送事件
		emits(
			"scroll",
			viewportScrollX.value,
			viewportScrollY.value,
			scrollPercent.value.x,
			scrollPercent.value.y
		);
		// ? 更新model-value
		modelValueScrollY.value =
			(props.valueMode === "percent"
				? scrollPercent.value.y
				: viewportScrollY.value) || modelValueScrollY.value;
		modelValueScrollX.value =
			(props.valueMode === "percent"
				? scrollPercent.value.x
				: viewportScrollX.value) || modelValueScrollY.value;
	},
});

// j 滚动进度百分比
const scrollPercent = computed(() => {
	const vTrackLen = Math.floor(
		verticalTrackInfo.height.value || viewportInfo.height
	);
	const hTrackLen = Math.floor(
		horizontalTrackInfo.width.value || viewportInfo.width
	);
	const yThumbLen = vTrackLen * state.vertical.lengthPercent;
	const xThumbLen = hTrackLen * state.horizontal.lengthPercent;
	return {
		y: verticalThumbTop.value / (vTrackLen - yThumbLen),
		x: horizontalThumbLeft.value / (hTrackLen - xThumbLen),
	};
});

// s 滚动条轨道DOM (垂直)
const verticalTrackDOM = useTemplateRef("verticalTrack");
// s 滚动条轨道尺寸信息 (垂直)
const verticalTrackInfo = useElementBounding(verticalTrackDOM);
// s 滚动条DOM (垂直)
const verticalThumbDOM = useTemplateRef("verticalThumb");

const { y: verticalThumbTop } = useDraggable(verticalThumbDOM, {
	axis: "y", // 限制垂直拖拽
	containerElement: verticalTrackDOM, // 设置父容器
	preventDefault: true,
	onStart({ y: _y }) {
		state.vertical.isDragging = true;
	},
	onMove({ y: _y }) {
		const { clientHeight, scrollHeight } = viewportDOM.value!;
		// track 总长
		const trackLen = Math.floor(verticalTrackInfo.height.value);
		// 计算滚动条长度
		const thumbLen = trackLen * state.vertical.lengthPercent;
		// 计算可滚动长度
		const remainTrackLen = trackLen * (1 - state.vertical.lengthPercent);
		// 防止超出边界
		if (verticalThumbTop.value + thumbLen > trackLen) {
			verticalThumbTop.value = trackLen - thumbLen;
		}
		// 计算滚动高度
		const scrollY =
			verticalThumbTop.value * ((scrollHeight - clientHeight) / remainTrackLen);
		// 更新滚动位置
		viewportScrollY.value = scrollY;
		// ? 发送事件
		emits(
			"scroll",
			viewportScrollX.value,
			viewportScrollY.value,
			scrollPercent.value.x,
			scrollPercent.value.y
		);
		// ? 更新model-value
		modelValueScrollY.value =
			(props.valueMode === "percent"
				? scrollPercent.value.y
				: viewportScrollY.value) || modelValueScrollY.value;
		modelValueScrollX.value =
			(props.valueMode === "percent"
				? scrollPercent.value.x
				: viewportScrollX.value) || modelValueScrollY.value;
	},
	async onEnd({ y: _y }) {
		state.vertical.isDragging = false;
	},
});

// j 垂直滚动条可见性
const verticalScrollbarVisible = computed<boolean>(() => {
	return (
		((state.show &&
			state.vertical.lengthPercent > 0 &&
			state.vertical.lengthPercent < 1) ||
			state.vertical.isDragging) &&
		props.showScrollbar &&
		(props.overflowY === "auto" || props.overflowY === "scroll")
	);
});

// j 滑块内容的样式
const calcVerticalThumbContentStyle = computed(() => {
	// 滑块总长
	const thumbLen =
		verticalTrackInfo.height.value * state.vertical.lengthPercent;

	const transform = `translateY(calc(-${scrollPercent.value.y * 100}% + ${
		thumbLen * scrollPercent.value.y
	}px))`;

	return {
		minWidth: thumbLen < 20 ? "16px" : "0",
		transform,
	} as HTMLAttributes["style"];
});

// s 滚动条轨道DOM (水平)
const horizontalTrackDOM = useTemplateRef("horizontalTrack");
// s 滚动条轨道尺寸信息 (水平)
const horizontalTrackInfo = useElementBounding(horizontalTrackDOM);
// s 滚动条DOM (水平)
const horizontalThumbDOM = useTemplateRef("horizontalThumb");
const { x: horizontalThumbLeft } = useDraggable(horizontalThumbDOM, {
	axis: "x", // 限制水平拖拽
	containerElement: horizontalTrackDOM, // 设置父容器
	preventDefault: true,
	onStart({ x: _x }) {
		state.horizontal.isDragging = true;
	},
	onMove({ x: _x }) {
		const { clientWidth, scrollWidth } = viewportDOM.value!;
		// track 总长
		const trackLen = Math.floor(horizontalTrackInfo.width.value);
		// 计算滚动条长度
		const thumbLen = trackLen * state.horizontal.lengthPercent;
		// 计算可滚动长度
		const remainTrackLen = trackLen * (1 - state.horizontal.lengthPercent);
		// 防止超出边界
		if (horizontalThumbLeft.value + thumbLen > trackLen) {
			horizontalThumbLeft.value = trackLen - thumbLen;
		}
		// 计算滚动 left
		const scrollX =
			horizontalThumbLeft.value *
			((scrollWidth - clientWidth) / remainTrackLen);
		// 更新滚动位置
		viewportScrollX.value = scrollX;
		// ? 发送事件
		emits(
			"scroll",
			viewportScrollX.value,
			viewportScrollY.value,
			scrollPercent.value.x,
			scrollPercent.value.y
		);
		// ? 更新model-value
		modelValueScrollY.value =
			(props.valueMode === "percent"
				? scrollPercent.value.y
				: viewportScrollY.value) || modelValueScrollY.value;
		modelValueScrollX.value =
			(props.valueMode === "percent"
				? scrollPercent.value.x
				: viewportScrollX.value) || modelValueScrollY.value;
	},
	async onEnd({ x: _x }) {
		state.horizontal.isDragging = false;
	},
});

// j 水平滚动条可见性
const horizontalScrollbarVisible = computed<boolean>(() => {
	return (
		((state.show &&
			state.horizontal.lengthPercent > 0 &&
			state.horizontal.lengthPercent < 1) ||
			state.horizontal.isDragging) &&
		props.showScrollbar &&
		(props.overflowX === "auto" || props.overflowX === "scroll")
	);
});

// j 滑块内容的样式
const horizontalThumbContentStyle = computed(() => {
	// 滑块总长
	const thumbLen =
		horizontalTrackInfo.width.value * state.horizontal.lengthPercent;

	const transform = `translateX(calc(-${scrollPercent.value.x * 100}% + ${
		thumbLen * scrollPercent.value.x
	}px))`;

	return {
		minHeight: thumbLen < 20 ? "16px" : "0",
		transform,
	} as HTMLAttributes["style"];
});

// f 计算滚动条尺寸
function calcThumbSize() {
	if (!viewportDOM.value) return;
	// ? 提取滚动容器内容区宽高
	const { scrollWidth, scrollHeight, clientWidth, clientHeight } =
		viewportDOM.value;

	// 垂直滚动条track长度
	const vTrackLen = Math.floor(verticalTrackInfo.height.value || clientHeight);
	// 垂直滚动条长度
	let verticalThumbLen = vTrackLen * (clientHeight / scrollHeight);
	// 计算垂直滚动条占track的占比
	const verticalThumbPercent = verticalThumbLen / vTrackLen;
	state.vertical.lengthPercent = verticalThumbPercent;

	// 水平滚动条track长度
	const hTrackLen = Math.floor(horizontalTrackInfo.width.value || clientWidth);
	// 水平滚动条长度
	let horizontalThumbLen = hTrackLen * (clientWidth / scrollWidth);
	// 计算水平滚动条占track的占比
	const horizontalThumbPercent = horizontalThumbLen / hTrackLen;
	state.horizontal.lengthPercent = horizontalThumbPercent;
}

// f 设置滚动条位置
function updateThumbPosition() {
	if (!viewportDOM.value) return;
	const { scrollWidth, scrollHeight, clientWidth, clientHeight } =
		viewportDOM.value;
	// 计算可滚动长度
	const vTrackLen =
		Math.floor(verticalTrackInfo.height.value || clientHeight) *
		(1 - state.vertical.lengthPercent);
	const hTrackLen =
		Math.floor(horizontalTrackInfo.width.value || clientWidth) *
		(1 - state.horizontal.lengthPercent);

	let top = (vTrackLen / (scrollHeight - clientHeight)) * viewportScrollY.value;
	let left = (hTrackLen / (scrollWidth - clientWidth)) * viewportScrollX.value;

	// 更新滚动条位置
	verticalThumbTop.value = top;
	horizontalThumbLeft.value = left;
}

// f 点击Track时的事件
function onClickTrack(direction: "vertical" | "horizontal", e: MouseEvent) {
	// ? 立即显示进度条
	state.show = true;
	if (!viewportDOM.value) return;
	const { scrollWidth, scrollHeight, clientWidth, clientHeight } =
		viewportDOM.value; // 提取滚动容器内容区宽度

	if (direction === "vertical") {
		const clickPos = e.offsetY;
		const { lengthPercent } = state.vertical;
		const oldThumbTop = verticalThumbTop.value;
		// track总长
		const trackLen = Math.floor(verticalTrackInfo.height.value);
		// track - 滚动条 的剩余长度
		const remainTrackLen = trackLen * (1 - state.vertical.lengthPercent);
		// 计算滚动条长度
		const length = lengthPercent * trackLen;
		// 计算滑块移动的差值
		const delta = clickPos - (oldThumbTop + length / 2);
		// 计算新的滑块位置
		let newThumbTop = oldThumbTop + delta;
		// ? 计算要滚动的实际scrollY
		const scrollY =
			newThumbTop * ((scrollHeight - clientHeight) / remainTrackLen);
		viewportScrollY.value = scrollY;
	} else {
		const clickPos = e.offsetX;
		const { lengthPercent } = state.horizontal;
		const oldThumbLeft = horizontalThumbLeft.value;
		// track总长
		const trackLen = Math.floor(horizontalTrackInfo.width.value);
		// track - 滚动条 的剩余长度
		const remainTrackLen = trackLen * (1 - state.horizontal.lengthPercent);
		// 计算滚动条长度
		const length = lengthPercent * trackLen;
		// 计算滑块移动的差值
		const delta = clickPos - (oldThumbLeft + length / 2);
		// 计算新的滑块位置
		let newThumbLeft = oldThumbLeft + delta;
		// ? 计算要滚动的实际scrollY
		const scrollX =
			newThumbLeft * ((scrollWidth - clientWidth) / remainTrackLen);
		viewportScrollX.value = scrollX;
	}
}

// j backTop 回到顶部按钮的显示状态
const bakctopShow = computed<Boolean>(() => {
	return viewportScrollY.value > 20;
});

// f 执行回到顶部
function backToTop() {
	requestAnimationFrame(() =>
		scrollTo({ y: 0, behavior: props.backToTopBehavior })
	);
}

// f 滚动到指定位置
function scrollTo(options: {
	x?: number;
	y?: number;
	behavior?: ScrollBehavior;
}) {
	if (!viewportDOM.value) return;
	const { x, y, behavior } = options;
	if (behavior !== undefined) {
		viewportDOM.value.scrollTo({ top: y, left: x, behavior });
	} else {
		if (x !== undefined) {
			viewportScrollX.value = x;
		}
		if (y !== undefined) {
			viewportScrollY.value = y;
		}
	}
}

// f 滚动到指定百分比
function scrollToPercent(options: {
	x?: number;
	y?: number;
	behavior?: ScrollBehavior;
}) {
	if (!viewportDOM.value) return;
	const { scrollWidth, scrollHeight, clientWidth, clientHeight } =
		viewportDOM.value;
	const { x, y, behavior } = options;
	let scrollX: number | undefined, scrollY: number | undefined;
	if (x !== undefined) {
		const hTrackLen = Math.floor(
			horizontalTrackInfo.width.value || clientWidth
		);
		const remainTrackLen = hTrackLen * (1 - state.horizontal.lengthPercent);
		const left = remainTrackLen * x;
		scrollX = left / (remainTrackLen / (scrollWidth - clientWidth));
	}
	if (y !== undefined) {
		const vTrackLen = Math.floor(
			verticalTrackInfo.height.value || clientHeight
		);
		const remainTrackLen = vTrackLen * (1 - state.vertical.lengthPercent);
		const top = remainTrackLen * y;
		scrollY = top / (remainTrackLen / (scrollHeight - clientHeight));
	}
	scrollTo({ x: scrollX, y: scrollY, behavior });
}

defineExpose({
	viewportDOM,
	x: viewportScrollX,
	y: viewportScrollY,
	scrollPercent,
	arrivedState,
	scrollTo,
	scrollToPercent,
});
</script>

<style lang="scss" scoped>
*,
*::after,
*::before {
	box-sizing: border-box;
	margin: unset;
	padding: unset;
}

// s 组件容器
.base-scrollbar_container {
	box-sizing: border-box;
	position: relative;
	width: 100%;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
}

// s 视口
.base-scrollbar__viewport {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	max-width: 100%;
	max-height: 100%;
	/* scroll-behavior: smooth; */
	overflow-y: v-bind("props.overflowY");
	overflow-x: v-bind("props.overflowX");
	/* transition: 0.5 ease; */

	/* ? 阻止滚动溢出到父级 */
	overscroll-behavior: contain;

	&:focus {
		outline: unset;
	}
}

// ? 去除原生滚动条样式
.base-scrollbar_container[data-disable="false"] {
	.base-scrollbar__viewport::-webkit-scrollbar {
		display: none !important;
		scrollbar-width: none !important; /* Firefox */
		-ms-overflow-style: none !important; /* IE 10+ */
	}
}

$track-size: v-bind("props.trackSize");
$track-padding: v-bind("props.thumbPadding");
$track-hover-padding: v-bind("props.hoverThumbPadding");

// z 虚拟滚动条track (共通样式)
.base-scrollbar__track {
	position: absolute;
	/* background: rgba(255, 166, 0, 0.573); */
	outline: unset;

	user-select: none;
	-webkit-user-select: none;

	// z 虚拟滚动条(共通)
	.base-scrollbar__thumb {
		position: absolute;
		inset: 0;
		outline: unset;

		/* background: rgba(255, 0, 0, 0.5); */

		// ? 滚动条thumb视觉区域
		&::after {
			position: absolute;
			content: "";

			border-radius: calc($track-size * 1px - $track-padding * 1px);
			inset: calc($track-padding * 1px);
			background: rgb(85, 170, 255);

			// ? 拟物阴影效果
			/* box-shadow: inset 1px 1px 1px 1px hsla(0, 0%, 100%, 0.5),
					inset -1px -1px 1px 1px hsla(0, 0%, 0%, 0.5); */

			opacity: 1;
			z-index: 1;

			transition: background 0.5s ease, opacity 0.5s ease, left 0.5s ease,
				right 0.5s ease, top 0.5s ease, bottom 0.5s ease, inset 0.5s ease;
		}

		// ? 滚动条边界指示器
		&::before {
			position: absolute;
			content: "";
			inset: calc($track-padding * 1px);
			border-radius: calc($track-size * 1px - $track-padding * 1px);
			transition: inset 0.5s ease, background 0.5s ease;
			z-index: 2;
		}

		&.arrived-top,
		&.arrived-bottom,
		&.arrived-left,
		&.arrived-right {
			&::before {
				background: hsl(25, 100%, 50%);
			}
		}

		$arrived-size: calc($track-size * 1px);

		&.arrived-top::before {
			bottom: calc(100% - $arrived-size);
		}

		&.arrived-bottom::before {
			top: calc(100% - $arrived-size);
		}

		&.arrived-left::before {
			right: calc(100% - $arrived-size);
		}

		&.arrived-right::before {
			left: calc(100% - $arrived-size);
		}

		&:hover {
			&::after {
				background: rgba(64, 160, 255);
			}
		}

		&:active {
			&::after {
				background: rgb(26, 139, 252);
			}
		}
	}

	// ? 当：鼠标悬浮track上、正在被拖拽，thumb的样式
	&:hover .base-scrollbar__thumb,
	&.is-dragging .base-scrollbar__thumb {
		&::after {
			inset: 0;
		}
		&::before {
			border-radius: calc($track-size * 1px - $track-padding * 1px);
		}
	}

	// z thumb 进入和退出时的过渡
	.scrollbar-enter-from,
	.scrollbar-leave-to {
		position: absolute;
		opacity: 0;
	}

	// 进入的过程中
	.scrollbar-enter-active {
		transition: 0.5s ease;
	}
	// 离开的过程中
	.scrollbar-leave-active {
		transition: 0.5s ease;
	}
}

// z 虚拟滚动条track (垂直)
.track__vertical {
	// 留出1px距离
	top: 1px;
	right: 0;
	width: 0;
	height: 100%;

	* {
		visibility: hidden;
	}

	transform: translateX(calc(v-bind("props.offset[0]") * -1px));

	transition: width 0.5s ease;

	// z 虚拟滚动条thumb(垂直)
	.thumb__vertical {
		top: 0;
		transition: height 0.5s ease;

		// z 插槽内容区样式
		.base-scrollbar__thumb__content {
			position: absolute;
			right: 100%;
			border-radius: 4px;
			min-width: 0;
			min-height: 0;
			overflow: hidden;
			background-color: #409eff;

			scale: 0;
			transition: scale 0.3s ease 1.5s, min-height 0.3s ease 1s,
				min-width 0.3s ease 1s;
		}
	}

	& > .thumb__vertical:active > .base-scrollbar__thumb__content,
	&:hover > .thumb__vertical > .base-scrollbar__thumb__content {
		min-width: 16px;
		min-height: 50px;
		scale: 1;
		transition: scale 0.3s ease, min-height 0.3s ease 0.3s, min-width 0.3s ease;
	}
}

[data-show-vertical-scrollbar="true"] {
	& > .track__vertical {
		width: calc($track-size * 1px);
		height: calc(100% - 1px);
		* {
			visibility: visible;
		}
	}
}

// z 虚拟滚动条track (水平)
.track__horizontal {
	// 留出1px距离
	left: 1px;
	bottom: 0;
	width: 100%;
	height: 0;
	/* 必须设置，否则当水平滚动条滚动到最底部时会无法点击 */
	z-index: 1;

	* {
		visibility: hidden;
	}

	transform: translateY(calc(v-bind("props.offset[1]") * -1px));
	transition: height 0.5s ease;

	// z 虚拟滚动条(水平)
	.thumb__horizontal {
		left: 0;
		transition: width 0.5s ease;

		// z 插槽内容区样式
		.base-scrollbar__thumb__content {
			position: absolute;
			bottom: 100%;
			border-radius: 4px;
			min-height: 0;
			min-width: 0;
			overflow: hidden;
			background-color: #409eff;

			scale: 0;
			transition: scale 0.3s ease 1.5s, min-height 0.3s ease 1s,
				min-width 0.3s ease 1s;
		}
	}

	& > .thumb__horizontal:active > .base-scrollbar__thumb__content,
	&:hover > .thumb__horizontal > .base-scrollbar__thumb__content {
		min-height: 16px;
		min-width: 50px;
		scale: 1;
		transition: scale 0.3s ease, min-height 0.3s ease, min-width 0.3s ease 0.3s;
	}
}

[data-show-horizontal-scrollbar="true"] {
	& > .track__horizontal {
		height: calc($track-size * 1px);
		width: calc(100% - 1px);
		* {
			visibility: visible;
		}
	}
}

// ? 处理滚动条交叉
[data-show-vertical-scrollbar="true"][data-show-horizontal-scrollbar="true"] {
	& > .track__horizontal {
		width: calc(
			100% - ($track-size * 1px + 1px + v-bind("props.offset[0]") * 1px)
		);
	}
	& > .track__vertical {
		height: calc(
			100% - ($track-size * 1px + 1px + v-bind("props.offset[1]") * 1px)
		);
	}
}

// s 返回顶部按钮样式
.base-scrollbar__back-top {
	position: absolute;
	width: 40px;
	height: 40px;

	right: 40px;
	bottom: 40px;

	border-radius: 50%;
	color: #409eff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	box-shadow: 0px 0px 6px rgba(0, 0, 0, 0.12);
	cursor: pointer;
	z-index: 5;
	background-color: #ffffff;

	transition: 0.5s ease;

	&:hover {
		background-color: #d0e3ff;
	}

	.back-top__icon {
		--color: inherit;
		height: 1em;
		width: 1em;
		line-height: 1em;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		position: relative;
		fill: currentColor;
		color: var(--color);
		font-size: inherit;
	}
}

// s back-top按钮进入和退出时的过渡
.back-top-enter-active {
	transition: opacity 0.3s;
}
.back-top-leave-active {
	transition: opacity 0.3s ease 0.5s;
}
.back-top-enter-from,
.back-top-leave-to {
	opacity: 0;
}
</style>
