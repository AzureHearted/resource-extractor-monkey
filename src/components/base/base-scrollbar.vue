<template>
	<!-- s 视口区域 -->
	<div
		ref="containerDOM"
		class="base-scrollbar_container"
		@mouseover="scrollbar.show = true"
		@mouseleave="scrollbar.show = false">
		<!-- s 包裹区 -->
		<div ref="wrapDOM" class="base-scrollbar__wrap">
			<!-- s 视口区内部区域 -->
			<div
				ref="viewDOM"
				class="base-scrollbar__view"
				@transitionend="handleUpdate()">
				<!--t 调试区域 -->
				<div v-if="false" class="debug">
					containerInfo {{ containerInfo.height }},{{ containerInfo.width
					}}<br />
					viewInfo {{ viewInfo.height }},{{ viewInfo.width }}<br />
					wrapInfo {{ wrapInfo.height }},{{ wrapInfo.width }}<br />
					wrapDOM {{ wrapDOM ? wrapDOM!.scrollHeight : 0 }} ,{{
						wrapDOM ? wrapDOM!.scrollWidth : 0
					}}
					scrollbarLength {{ scrollbar.vertical.length }},{{
						scrollbar.horizontal.length
					}}
				</div>
				<!-- s 插槽出口 (内容) -->
				<slot></slot>
			</div>
			<teleport :disabled="!teleportTo" :to="teleportTo ? teleportTo : 'body'">
				<!--t 垂直滚动条 -->
				<transition name="scrollbar">
					<div
						ref="verticalBar"
						class="base-scrollbar__bar bar__is-vertical"
						:class="{ 'is-dragging': scrollbar.vertical.isDragging }"
						v-show="verticalScrollbarVisible"
						@mousedown.stop
						@mouseup.stop
						@click.stop
						@touchend.stop
						:style="[
							verticalStyle,
							{
								right: `${offset[0]}px`,
							},
						]"></div>
				</transition>
				<!--t 水平滚动条 -->
				<transition name="scrollbar">
					<div
						ref="horizontalBar"
						class="base-scrollbar__bar bar__is-horizontal"
						:class="{ 'is-dragging': scrollbar.horizontal.isDragging }"
						v-show="horizontalScrollbarVisible"
						@mousedown.stop
						@mouseup.stop
						@click.stop
						@touchend.stop
						:style="[
							horizontalStyle,
							{
								bottom: `${offset[1]}px`,
							},
						]"></div>
				</transition>
			</teleport>
			<!--t 回到顶部按钮 -->
			<transition name="back-top">
				<div
					class="base-scrollbar__back-top"
					v-show="bakctopShow && showBackTopButton"
					@click="backToTop">
					<i class="back-top__icon">
						<svg
							data-v-e6ff9537=""
							viewBox="0 0 1024 1024"
							width="1.2em"
							height="1.2em">
							<path fill="currentColor" d="M512 320L192 704h639.936z"></path>
						</svg>
					</i>
				</div>
			</transition>
		</div>
	</div>
</template>

<script setup lang="ts">
	import {
		ref,
		reactive,
		onMounted,
		computed,
		watch,
		nextTick,
		defineProps,
		withDefaults,
		onUpdated,
		onActivated,
		onDeactivated,
	} from "vue";
	import type { ComputedRef, CSSProperties, TeleportProps } from "vue";
	import type { Property } from "csstype"; // s 引入css类型接口(方便开发)

	import { useScroll, useElementBounding, useDraggable } from "@vueuse/core";

	// 定义props
	const props = withDefaults(
		defineProps<{
			showScrollbar?: boolean; // s 显示滚动条？
			showBackTopButton?: boolean; // s 显示回到顶部按钮？
			barWidth?: Property.Width; // s 宽度 (滚动条)
			barHoverWidth?: Property.Width; // s 宽度 (滚动条 & 悬浮)
			offset?: [number, number]; // s 滚动条偏移量 [垂直滚动条的横向偏移,水平滚动条的纵向偏移]
			teleportTo?: TeleportProps["to"] | false;
		}>(),
		{
			showScrollbar: true,
			showBackTopButton: false,
			barWidth: "6px",
			barHoverWidth: "10px",
			offset: () => [1, 1],
			teleportTo: false,
		}
	);

	// 组件容器DOM
	const containerDOM = ref<HTMLElement | null>(null);
	const containerInfo = reactive({
		...useElementBounding(containerDOM),
	});
	// 滚动容器
	const wrapDOM = ref<HTMLElement | null>(null);
	const wrapInfo = reactive({
		...useElementBounding(wrapDOM),
	});
	// 内容区DOM
	const viewDOM = ref<HTMLElement | null>(null);
	const viewInfo = reactive({
		...useElementBounding(viewDOM),
	});

	watch(
		() => [wrapInfo.width, wrapInfo.height, viewInfo.width, viewInfo.height],
		() => {
			handleUpdate();
		}
	);

	onUpdated(() => {
		handleUpdate();
	});

	// 更新
	let timer: number | null = null; // 计时器
	// 更新函数
	function update() {
		calculateScrollbarSize(); //计算滚动条尺寸
		setScrollbarPosition(); //计算滚动条位置
	}
	interface UpdateOptions {
		delay: number;
	}
	function handleUpdate(
		options?: UpdateOptions // 配置选项,可用于临时调整时间间隔
	) {
		// 默认配置项
		const defaultOptions: UpdateOptions = {
			delay: 300,
		};
		// 获取配置参数
		const { delay } = { ...defaultOptions, ...options };

		// 节流写法
		if (!timer) {
			timer = window.setTimeout(() => {
				// console.log("触发 scrollbar 更新");
				update(); // 执行任务
				timer = null;
			}, delay);
		}
	}

	// 状态数据
	const scrollbar = reactive({
		show: false,
		vertical: {
			width: 8, // 滚动条宽度，根据实际情况调整
			length: -1, // -1 表示默认无滚动条
			top: 0, // 滚动条位置
			isDragging: false,
			y: 0,
		},
		horizontal: {
			width: 8, // 滚动条宽度，根据实际情况调整
			length: -1, // -1 表示默认无滚动条
			left: 0, // 滚动条位置
			isDragging: false,
			x: 0,
		},
	});

	// s 标记组件是否被冻结
	const freeze = ref(false);

	//* 组件被解冻时
	onActivated(() => {
		nextTick(() => {
			update();
		});
		setTimeout(() => {
			update();
			freeze.value = false;
		});
	});
	//* 组件被冻结时
	onDeactivated(() => {
		freeze.value = true;
	});

	// s 滚动对象
	const { x: wrapperX, y: wrapperY, isScrolling } = useScroll(wrapDOM);
	// w 监听wrapper滚动
	watch([wrapperX, wrapperY], ([x, y]) => {
		// console.log("wrapper滚动", x, y);
		if (!scrollbar.vertical.isDragging) {
			// 只有在scrollbar未被拖动时进行scrollbar位置设置(防止与拖动事件冲突)
			setScrollbarPosition();
		}
	});

	// s 滚动条DOM(垂直)
	const verticalBar = ref<HTMLElement | null>(null);
	onMounted(() => {
		useDraggable(verticalBar, {
			axis: "y", // 限制垂直拖拽
			containerElement: containerDOM.value, // 设置父容器
			preventDefault: true,
			onStart({ y }) {
				scrollbar.vertical.isDragging = true;
				// console.log("开始拖拽", y);
			},
			onMove({ y }) {
				// console.log("拖拽中", y, verticalBar.value?.offsetHeight);
				calcVerticalBarPosition(y);
			},
			onEnd({ y }) {
				scrollbar.vertical.isDragging = false;
				// console.log("拖拽结束", y);
			},
		});
	});

	watch(
		() => scrollbar.vertical.y,
		(nowY) => {
			calcVerticalBarPosition(nowY);
		}
	);

	// f 设置垂直滚动条位置
	const calcVerticalBarPosition = async (y: number) => {
		if (!wrapDOM.value) return;
		scrollbar.vertical.top = y; // 更新滚动条位置
		if (isScrolling.value) return; //如果此时页面正在滚动则不进行下面的操作
		// 计算滚动距离
		const { scrollWidth, scrollHeight } = wrapDOM.value; // 提取滚动容器内容区宽高
		const top = (scrollHeight / containerInfo.height) * scrollbar.vertical.top;
		const left =
			(scrollWidth / containerInfo.width) * scrollbar.horizontal.left;
		// 更新滚动距离
		nextTick(() => {
			updateScrollPosition({ y: top, x: left, behavior: "instant" });
		});
	};

	// j 滚动条样式(垂直)
	const verticalStyle: ComputedRef<CSSProperties> = computed(() => {
		return {
			// 根据滚动条长度决定是否显示滚动条
			height: `${scrollbar.vertical.length}px`,
			top: `${scrollbar.vertical.top}px`,
		};
	});

	// j 垂直滚动条可见性
	const verticalScrollbarVisible = computed<boolean>(() => {
		return (
			((scrollbar.show && scrollbar.vertical.length > 0) ||
				scrollbar.vertical.isDragging) &&
			props.showScrollbar
		);
	});

	// s 滚动条DOM(水平)
	const horizontalBar = ref<HTMLElement | null>(null);
	onMounted(() => {
		const { x } = useDraggable(horizontalBar, {
			axis: "x", // 限制水平拖拽
			containerElement: containerDOM.value, // 设置父容器
			onStart({ x }) {
				scrollbar.horizontal.isDragging = true;
				// console.log("开始拖拽", y);
			},
			onMove({ x }) {
				// console.log("拖拽中", x);
				calcHorizontalBarPosition(x);
			},
			onEnd({ x }) {
				scrollbar.horizontal.isDragging = false;
				// console.log("拖拽结束", y);
			},
		});
	});

	watch(
		() => scrollbar.horizontal.x,
		(nowX) => {
			calcHorizontalBarPosition(nowX);
		}
	);

	// f 设置水平滚动条位置
	const calcHorizontalBarPosition = async (x: number) => {
		if (!wrapDOM.value) return;
		scrollbar.horizontal.left = x; // 更新滚动条位置
		scrollbar.horizontal.x = x;
		if (isScrolling.value) return; // 如果此时页面正在滚动则不进行下面的操作
		const { scrollWidth, scrollHeight } = wrapDOM.value; // 提取滚动容器内容区宽高
		// 计算滚动距离
		const top = (scrollHeight / wrapInfo.height) * scrollbar.vertical.top;
		const left = (scrollWidth / wrapInfo.width) * scrollbar.horizontal.left;
		// 更新滚动距离
		nextTick(() => {
			updateScrollPosition({ y: top, x: left, behavior: "instant" });
		});
	};

	// j 滚动条样式(水平)
	const horizontalStyle: ComputedRef<CSSProperties> = computed(() => {
		return {
			// 根据滚动条长度决定是否显示滚动条
			width: `${scrollbar.horizontal.length}px`,
			left: `${scrollbar.horizontal.left}px`,
		};
	});

	// j 水平滚动条可见性
	const horizontalScrollbarVisible = computed<boolean>(() => {
		return (
			((scrollbar.show && scrollbar.horizontal.length > 0) ||
				scrollbar.horizontal.isDragging) &&
			props.showScrollbar
		);
	});

	// t (算法)由当前视口高度计算滚动条高度
	const calcBarLength = (
		channelHeightOrWidth: number, // 滚动条轨道高度(或宽度)
		scrollHeightOrWidth: number, // 滚动区域总高度(或宽度)
		contentHeightOrWidth: number // 当前界面显示内容的高度(或宽度)
	) => {
		return channelHeightOrWidth * (contentHeightOrWidth / scrollHeightOrWidth);
	};

	// f 计算滚动条尺寸
	async function calculateScrollbarSize() {
		if (!wrapDOM.value || !containerDOM.value) return;
		const { width: channelWidth, height: channelHeight } = containerInfo; // 提取滚动容器视口宽高
		const { width: wrapWidth, height: wrapHeight } = wrapInfo; // 提取滚动容器视口宽高
		const { scrollWidth, scrollHeight } = wrapDOM.value; // 提取滚动容器内容区宽高
		// 计算垂直滚动条长度
		scrollbar.vertical.length =
			Math.floor(scrollHeight) > Math.ceil(wrapHeight)
				? calcBarLength(channelHeight, scrollHeight, wrapHeight)
				: -1;
		// 计算水平滚动条长度
		scrollbar.horizontal.length =
			Math.floor(scrollWidth) > Math.ceil(wrapWidth)
				? calcBarLength(channelWidth, scrollWidth, wrapWidth)
				: -1;
	}

	// f 设置滚动条位置
	async function setScrollbarPosition() {
		if (!wrapDOM.value) return;
		const { width: channelWidth, height: channelHeight } = containerInfo; // 提取滚动容器视口宽高
		const { width: wrapWidth, height: wrapHeight } = wrapInfo;
		const { scrollWidth, scrollHeight } = wrapDOM.value; // 提取滚动容器内容区宽高
		// 更新滚动条位置
		scrollbar.vertical.y =
			(wrapHeight / scrollHeight) *
			wrapperY.value *
			(channelHeight / wrapHeight);
		scrollbar.horizontal.x =
			(wrapWidth / scrollWidth) * wrapperX.value * (channelWidth / wrapWidth);
		// console.log("滚动事件", scrollTop);
	}

	// f 设置wrapper的滚动位置
	async function updateScrollPosition(options: {
		x?: number;
		y?: number;
		behavior?: ScrollBehavior;
	}) {
		const { x, y, behavior } = options;
		if (wrapDOM.value) {
			if (behavior !== undefined) {
				wrapDOM.value.scrollTo({ top: y, left: x, behavior });
			} else {
				if (x !== undefined) {
					wrapperX.value = x;
				}
				if (y !== undefined) {
					wrapperY.value = y;
				}
			}
			// console.log("触发滚动contentDOM");
		}
	}

	// f backTop 回到顶部按钮
	const bakctopShow = computed<Boolean>(() => {
		return scrollbar.vertical.top > 20;
	});

	// f 执行回到顶部
	async function backToTop() {
		updateScrollPosition({ y: 0 });
	}
</script>

<script lang="ts">
	export default {
		name: "BaseScrollbar", // 组件名，用于调试和注册组件时使用
	};
</script>

<style lang="scss" scoped>
	// 视口容器
	.base-scrollbar_container {
		box-sizing: border-box;
		position: relative;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		// overflow: hidden;
		display: flex;
		flex-flow: column nowrap;
		// border: 1px solid black;
		// background: white;
	}

	// 内容容器
	.base-scrollbar__wrap {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		scroll-behavior: smooth;
		overflow: auto; // 默认xy方向都可以滚动
	}

	.base-scrollbar__view {
		box-sizing: border-box;
		// background: wheat;
		transition: opacity 0.5s, width 0.5s, height 0.5s;
	}

	/* 去除原生滚动条样式 */
	.base-scrollbar__wrap::-webkit-scrollbar {
		display: none !important;
		width: 0px !important;
		height: 0px !important;
	}

	// 虚拟滚动条(共通)
	.base-scrollbar__bar {
		position: absolute;

		border-radius: 10px;
		-webkit-box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.5),
			0 0 2px rgb(0, 0, 0, 0.5);
		box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.5),
			0 0 2px rgb(0, 0, 0, 0.5);

		background: rgba(64, 160, 255, 0.5);
		opacity: 1;

		// background: orange;

		user-select: none;
		-webkit-user-select: none;

		transition: background 0.5s, opacity 0.5s, width 0.5s, height 0.5s;

		z-index: 1;

		&:hover,
		&.is-dragging {
			background: rgba(64, 160, 255, 0.7);
		}
		&:active {
			background: rgb(64, 160, 255);
		}
	}

	// 虚拟滚动条(垂直)
	.bar__is-vertical {
		top: 0;
		right: 1px;
		width: v-bind("$props.barWidth");
		&:hover,
		&.is-dragging {
			width: v-bind("$props.barHoverWidth");
		}
	}
	// 虚拟滚动条(水平)
	.bar__is-horizontal {
		left: 0;
		bottom: 1px;
		height: v-bind("$props.barWidth");
		&:hover,
		&.is-dragging {
			height: v-bind("$props.barHoverWidth");
		}
	}

	// 进入和退出时的过渡
	.scrollbar-enter-from,
	.scrollbar-leave-to {
		position: absolute;
		opacity: 0;
	}

	// 进入的过程中
	.scrollbar-enter-active {
		transition: 0.5s;
	}
	// 离开的过程中
	.scrollbar-leave-active {
		transition: 1s;
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

		transition: 0.5s;

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
	.debug {
		position: absolute;
		bottom: 0;
		z-index: 10;
		background: white;
	}
	.back-top-enter-active,
	.back-top-leave-active {
		transition: opacity 0.5s ease;
	}

	.back-top-enter-from,
	.back-top-leave-to {
		opacity: 0;
	}
</style>
