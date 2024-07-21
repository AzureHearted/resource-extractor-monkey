<template>
	<div
		class="waterfall__container"
		:data-columns="state.columns"
		ref="containerDom">
		<div
			v-for="(item, index) in dataInfo.list"
			:key="item.id"
			class="waterfall__item__container">
			<div class="waterfall__item__content">
				<slot :item="item" :index="index">
					<BaseImg :src="item.preview.url" />
				</slot>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import Masonry from "masonry-layout";

	// 导入必要的类型和组件
	import {
		ref,
		reactive,
		defineProps,
		withDefaults,
		computed,
		nextTick,
		onMounted,
		watch,
		onActivated,
		onDeactivated,
	} from "vue";
	import BaseCard from "./base-card.vue";
	import BaseImg from "./base-img.vue";
	import type { CSSProperties, ComputedRef } from "vue";
	import type Card from "@/stores/CardStore/class/Card";
	import { stat } from "fs";
	import { useElementSize } from "@vueuse/core";

	// props定义
	const props = withDefaults(
		defineProps<{
			data: Card[]; // 数据对象
			keyProp?: string; // 数据源中用于作为唯一标识的属性名。
			itemPadding?: number | string; // 每个item之间的间距。
			itemBaseWidth?: number; // 每个item的基准宽度。
			disenableTransition?: boolean; // 禁用过渡
			loading?: boolean;
			// 暂停布局?
			pauseLayout?: boolean;
		}>(),
		{
			data: () => [] as any[], // 默认值为空数组。
			keyProp: "id", // 默认值为"id"。
			itemPadding: "2px", // 默认值为
			itemBaseWidth: 220, // 默认值为220。
			disenableTransition: true, // 默认不禁用过渡
			loading: false, // 默认值为false。
			pauseLayout: false,
		}
	);

	// 数据信息
	const dataInfo = reactive({
		list: [] as Card[],
	});

	// 状态信息
	const state = reactive({
		columns: ref(4), // 列数
		nextTops: ref<number[]>([]), // 每列当前高度
		itemFixWidth: ref<number | null>(null), // item当前宽度
		containerHeight: ref<number>(0), // 容器高度
	});

	// 容器DOM
	// const containerDom = ref<{ $el: HTMLElement } | null>(null);
	const containerDom = ref<HTMLElement | null>(null);

	let masonry: Masonry;
	//t 瀑布流配置对象
	const masonryOptions: Masonry.Options = {
		itemSelector: ".waterfall__item__container", //将以此选择器对应的元素作为瀑布流内容元素
		columnWidth: ".waterfall__container .waterfall__item__container", //将以此选择器对应的元素宽度作为瀑布流的列宽
		percentPosition: true, //支持百分比宽度
		// horizontalOrder: true,
		// stagger: 0,
		initLayout: false,
		// transitionDuration: 0,
	};

	onMounted(() => {
		if (!containerDom.value) return;
		masonry = new Masonry(containerDom.value, masonryOptions);
		// 创建时如果数据不为空则进行进行一次布局
		if (props.data.length && !dataInfo.list.length) {
			dataInfo.list = props.data;
			// console.time("等待nextTick");
			nextTick(() => {
				// console.timeEnd("等待nextTick");
				resetPosition();
			});
		}
	});

	//s 判断组件是否被冻结
	const freeze = ref(false);

	//* 当组件被激活时执行
	onActivated(() => {
		// console.log("组件==>被激活");
		freeze.value = false;
		nextTick(() => {
			resetPosition();
		});
	});

	//* 当组件冻结之前执行(记录每张卡片的位置)
	onDeactivated(() => {
		freeze.value = true;
		// console.log("组件==>被冻结");
	});

	// 监听传入的数组变化
	watch(
		() => props.data,
		(newList) => {
			handleResetPosition(() => {
				dataInfo.list = newList;
			});
		}
	);

	// f 数据改变(带防抖)
	let timer: number; // 计时器
	let handleTask: Function = () => {}; // 任务
	// 默认配置项
	const defaultOptions = {
		delay: 300,
	};
	defineExpose({
		handleResetPosition: () => {
			masonry.layout!();
		},
	});
	function handleResetPosition(
		task?: (() => void) | any,
		options?: { delay: number } // 配置选项,可用于临时调整时间间隔
	) {
		// 先记录任务
		if (task instanceof Function) {
			handleTask = task;
		}
		// 如果计时器还没结束就又出触发该函数就清除计时器(重置计时)
		clearTimeout(timer);

		// 获取配置参数
		const { delay } = { ...defaultOptions, ...options };
		// 设置计时器等待时间到达执行重新布局
		timer = window.setTimeout(() => {
			// 最后布局
			// console.time("布局");
			handleTask(); // 执行任务
			nextTick(() => {
				resetPosition();
			});
			// console.timeEnd("布局");
			// handleTask = () => {}; // 重置任务
			// console.timeEnd("布局");
		}, delay);
	}

	function resetPosition() {
		if (!containerDom.value || freeze.value) return;
		masonry = new Masonry(containerDom.value, masonryOptions);
		masonry.layout!();
	}
</script>

<style lang="scss" scoped>
	* {
		box-sizing: border-box;
	}
	// 瀑布流组件外侧容器
	.waterfall__container {
		box-sizing: border-box;
	}

	.waterfall__item__container {
		float: left;
		// width: v-bind("100/state.columns+'%'");
		@media screen and (min-width: 0px) {
			width: calc(100% / 1);
		}
		@media screen and (min-width: 380px) {
			width: calc(100% / 2);
		}
		@media screen and (min-width: 720px) {
			width: calc(100% / 3);
		}
		@media screen and (min-width: 1100px) {
			width: calc(100% / 4);
		}
		@media screen and (min-width: 1280px) {
			width: calc(100% / 5);
		}

		box-sizing: border-box;
		//计数器
		counter-increment: section;
		& > img {
			display: block;
			max-width: 100%;
		}
		&::before {
			position: absolute;
			// 使用计数器
			// content: counter(section);
			font-size: medium;
			font-weight: bold;
			background: white;
			z-index: 1;
		}
	}

	.waterfall__item__content {
		padding: 2px;
	}
</style>
