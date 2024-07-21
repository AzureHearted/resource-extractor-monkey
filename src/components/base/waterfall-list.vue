<template>
	<div
		class="waterfall-container"
		:data-disenable-transition="disenableTransition"
		@transitionend="handleTransitionend">
		<transition-group
			name="list-complete"
			appear
			ref="containerDom"
			:style="{ ...containerStyle }"
			class="waterfall-list-container"
			@before-leave="onBeforeLeave"
			tag="div">
			<template
				v-for="(item, index) in dataInfo.list"
				:key="item[keyProp] ? item[keyProp] : index">
				<div
					class="item-container list-complete-item"
					ref="itemDOMs"
					:style="{ ...itemStyle }"
					:data-index="index">
					<slot :item="item" :index="index">
						<BaseCard :data="item" :img-url="item.url" :img-thumb="item.thumb">
						</BaseCard>
					</slot>
				</div>
			</template>
		</transition-group>
		<!-- 底部区域 -->
		<div class="bottom">
			<!-- 底部“加载更多” -->
			<div v-if="loading" class="bottom-loading">加载中...</div>
		</div>
	</div>
</template>

<script setup lang="ts">
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
	import type { CSSProperties, ComputedRef } from "vue";

	export interface IData {
		url: string; // 图片URL
		thumb: string; // 缩略图URL
		[key: string]: any;
	}

	// props定义
	const props = withDefaults(
		defineProps<{
			data: any[]; // 数据对象
			keyProp?: string; // 数据源中用于作为唯一标识的属性名。
			itemPadding?: number | string; // 每个item之间的间距。
			itemBaseWidth?: number; // 每个item的基准宽度。
			disenableTransition?: boolean; // 禁用过渡
			sizeMap?: {
				[key: number]: { columns: number };
			}; // 图片URL到宽高的映射表。
			loading?: boolean;
			// 暂停布局?
			pauseLayout?: boolean;
		}>(),
		{
			data: () => [] as any[], // 默认值为空数组。
			keyProp: "id", // 默认值为"id"。
			itemPadding: "2px", // 默认值为
			itemBaseWidth: 220, // 默认值为220。
			disenableTransition: false, // 默认不禁用过渡
			// 响应式瀑布流的映射配置
			sizeMap: () => {
				return {
					1280: { columns: 5 },
					1100: { columns: 4 },
					720: { columns: 3 },
					380: { columns: 2 },
					0: { columns: 1 },
				};
			}, // 默认值为空Map。
			loading: false, // 默认值为false。
			pauseLayout: false,
		}
	);

	// 数据信息
	const dataInfo = reactive({
		list: [] as any[],
	});

	// 状态信息
	const state = reactive({
		columns: ref(4), // 列数
		nextTops: ref<number[]>([]), // 每列当前高度
		itemFixWidth: ref<number | null>(null), // item当前宽度
		containerHeight: ref<number>(0), // 容器高度
	});

	// 容器DOM
	const containerDom = ref<{ $el: HTMLElement } | null>(null);
	// 子元素DOM集合
	const itemDOMs = ref<HTMLElement[] | null>(null);

	// 容器样式定义
	const containerStyle: ComputedRef<CSSProperties> = computed(() => {
		return {
			height: dataInfo.list.length ? state.containerHeight + "px" : "",
		};
	});

	// 每个item的样式定义
	const itemStyle: ComputedRef<CSSProperties> = computed(() => {
		const padding =
			typeof props.itemPadding === "number"
				? props.itemPadding + "px"
				: props.itemPadding; // 处理padding为px单位
		return { padding };
	});

	// f 数据改变(带防抖)
	let timer: number; // 计时器
	let handleTask: Function = () => {}; // 任务
	// 默认配置项
	const defaultOptions = {
		delay: 300,
	};
	defineExpose({ handleResetPosition });
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
				if (!resetPosition()) {
					setTimeout(() => {
						handleResetPosition();
						// console.timeEnd("布局");
					});
					console.log("布局失败！");
				} else {
					// console.timeEnd("布局");
				}
			});
			// console.timeEnd("布局");
			// handleTask = () => {}; // 重置任务
			// console.timeEnd("布局");
		}, delay);
	}

	//* 组件挂载后执行
	onMounted(() => {
		console.log("组件==>被挂载");
		useResizeObserver(containerDom.value!.$el, () => {
			// 如果是窗口变化则将执行间隔调低至250ms
			// console.time("容器尺寸变化");
			// .5s 再在触发
			handleResetPosition(null, { delay: 200 });
			// console.timeEnd("容器尺寸变化");
		});
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

	// 元素离开前
	const onBeforeLeave: any = (el: HTMLElement) => {
		el.style.transitionDelay = "";
	};

	// 监听传入的数组变化
	watch(
		() => props.data,
		(newList) => {
			// console.log("数组变化", newList, oldList);
			// if (newList.length < oldList.length) console.log("waterfall-list 数组减少");
			handleResetPosition(() => {
				dataInfo.list = newList;
			});
		}
	);

	// 计算列数
	function calcColumns() {
		let container = containerDom.value!.$el;
		// console.log(container);
		// 用当前item宽度计算列数
		const containerWidth = container.clientWidth;
		let itemBaseWidth = props.itemBaseWidth;
		let sizeMap = props.sizeMap; // 预设尺寸映射表，用于响应式布局
		let nowColumns = 1; //默认列数

		// 判断是否使用了sizeMap
		if (Object.keys(sizeMap).length > 0) {
			// 查询当前窗口宽度
			let ww = window.innerWidth;
			// 找到对应的预设
			let sizeSet: { columns: number } | null = null;
			for (const key in sizeMap) {
				if (ww > Number(key)) {
					// console.log(ww, Number(key));
					sizeSet = sizeMap[key];
				}
			}
			// console.log(ww, sizeMap, sizeSet);
			if (sizeSet) {
				nowColumns = sizeSet.columns;
				// 同时修改itemBaseWidth
				itemBaseWidth = containerWidth / nowColumns;
			} else {
				// 如果没有找到，则使用默认值或最大值
				nowColumns = Math.floor(containerWidth / itemBaseWidth);
			}
		} else {
			nowColumns = Math.floor(containerWidth / itemBaseWidth);
		}
		// console.log("当前列数", nowColumns);
		let FixWidth: number = state.itemFixWidth!;
		// 列数判断
		if (nowColumns === 1) {
			// 处理只有一列的情况
			FixWidth = containerWidth;
		} else {
			// 大于1列的情况
			// 计算剩余空间
			let remainSpace = containerWidth - nowColumns * itemBaseWidth;
			// 计算每个图片的间距(作为补偿)
			FixWidth = itemBaseWidth + remainSpace / nowColumns;
		}
		state.itemFixWidth = FixWidth;
		state.columns = nowColumns;
		// console.log("当前每列宽度", itemFixWidth);
		return { columns: nowColumns, fixWidth: FixWidth };
	}

	watch(
		() => props.pauseLayout,
		(newValue, oldValue) => {
			if (newValue && newValue !== oldValue) {
				resetPosition();
			}
		}
	);

	// 重新设置item坐标
	async function resetPosition() {
		if (props.pauseLayout || freeze.value) {
			// console.log("已暂停布局");
			return true;
		}
		// console.log("重新布局！！！");
		if (!containerDom.value) {
			// 没有容器就标记为布局未完成
			return false;
		}
		if (!itemDOMs.value?.length) {
			// 没有子元素则直接标记为布局完成
			// console.log("没有子元素==>布局完成");
			return true;
		}
		let info = calcColumns();
		// console.log("尺寸变化,容器高度", this.containerDom.clientHeight);
		// 该数组的长度为列数，每一项表示该列的下一个图片的纵坐标
		// 先按照序号排序
		let children = itemDOMs.value.sort(
			(a, b) => Number(a.dataset.index) - Number(b.dataset.index)
		);

		// 二次确认是否有子元素
		if (!children.length) {
			// 没有子元素则直接标记为布局完成
			// console.log("没有子元素==>布局完成");
			return true;
		}

		// 重置每列的高度
		let nextTopsInner: number[] = new Array(info.columns).fill(0);

		// 计算每个盒子的位置
		for (let i = 0; i < children.length; i++) {
			let box = children[i];

			// 执行逻辑
			const handle = async ({
				clientWidth: bw,
				clientHeight: bh,
			}: {
				clientWidth: number;
				clientHeight: number;
			}) => {
				// 获取元素宽高比
				const aspectRatio = bw / bh;
				// 纵坐标
				let minTop = Math.min(...nextTopsInner); //找到最低的高度
				let index = nextTopsInner.indexOf(minTop); //找到最低的高度的列号
				// 横坐标
				let left = index * state.itemFixWidth!;
				// 设置位置
				setItemPosition(box, minTop, left);
				// 如果是第一次加载则需要等待图片加载完成
				nextTopsInner[index] += state.itemFixWidth! / aspectRatio; // 使用元素比例计算高度
				state.nextTops = nextTopsInner;
			};
			// 任务
			const task = (): Promise<void> => {
				return new Promise((resolve) => {
					const { clientWidth, clientHeight } = box;

					if (clientWidth !== state.itemFixWidth) {
						box.style.width = state.itemFixWidth + "px";
					}
					nextTick(() => {
						handle({ clientWidth, clientHeight });
						resolve();
					});
				});
			};

			await task();
		}
		setContainerHeight(nextTopsInner);
		return true;
	}

	// 设置元素位置
	const setItemPosition = (itemDom: HTMLElement, top: number, left: number) => {
		itemDom.style.top = top + "px";
		itemDom.style.left = left + "px";
	};

	// 设置容器高度
	function setContainerHeight(nextTops: number[]) {
		// console.log("当前->nextTops", nextTops);
		state.containerHeight = Math.max(...nextTops);
	}

	// 容器内有元素过渡结束时的回调
	function handleTransitionend(e: TransitionEvent) {
		// console.log("元素过渡结束");
		// const propertyNames = ["width", "height", "top", "left", "aspect-ratio"];
		const propertyNames = ["height", "aspect-ratio"];
		// console.log("有元素过渡结束 => ", e.propertyName);
		if (propertyNames.includes(e.propertyName)) {
			// console.log("有元素过渡结束 => ", e.propertyName);
			handleResetPosition(null, { delay: 300 });
		}
		// handleResetPosition(null, { delay: 300 });
	}

	// ResizeObserver API的封装
	function useResizeObserver(target: HTMLElement, callback: Function) {
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
</script>

<style lang="scss" scoped>
	// 瀑布流组件外侧容器
	.waterfall-container {
		// background: orange;
		transition: 0.3s;
		box-sizing: border-box;
		* {
			box-sizing: border-box;
		}
	}
	// 瀑布流列表容器
	.waterfall-list-container {
		position: relative;
		transition: 0.3s;
		.item-container {
			position: absolute;
			//计数器
			counter-increment: section;

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
	}

	.waterfall-container[data-disenable-transition="true"] {
		transition: none !important;
		* {
			transition: none !important;
		}
	}

	$duration: 0.3s;
	/* 定义过渡效果 */
	.list-complete-item {
		transition: all $duration;
		// transition: $duration;
	}

	/* 对移动中的元素应用的过渡 */
	.list-complete-move,
	.list-complete-enter-active,
	.list-complete-leave-active {
		transition: all $duration;
		transition-delay: 0 !important;
	}

	// 进场过渡
	.list-complete-enter-from {
		position: absolute;
		opacity: 0;
		transform: translateY(200px);
	}
	// 退场过渡
	.list-complete-leave-to {
		opacity: 0;
		transform: scale(0.1);
	}

	// 进入的过程中
	.list-complete-enter-active {
		transition: all 0.5s;
	}
	// 离开的过程中
	.list-complete-leave-active {
		transition: all 0.3s;
	}

	.bottom {
		// 底部加载区域
		.bottom-loading {
			text-align: center;
			padding: 10px 0 20px 0;
			color: #999999;
			font-size: 14px;
			font-weight: 500;
			transition: 0.3s;
		}
	}
</style>
