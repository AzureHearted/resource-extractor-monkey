<template>
	<div class="base-tabs__container">
		<div ref="navRef" class="base-tabs__nav">
			<!-- ? 向左切换控制条 -->
			<div
				ref="navLeftButton"
				:data-show="showButtons && tabs.length > 0"
				class="base-tabs__nav-arrow base-tabs__nav-arrow-left"
				@click.stop.prevent="toggleTab('pre')"
				@transitionend="updateTabBounding()"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<g fill="none" fill-rule="evenodd">
						<path
							d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
						/>
						<path
							fill="currentColor"
							d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414z"
						/>
					</g>
				</svg>
			</div>
			<div ref="navWrapRef" class="base-tabs__nav-wrap">
				<!-- s Tab列表标签 -->
				<div
					ref="tabRefs"
					class="base-tabs__tab-item"
					:class="{ active: activeTab === tab.name }"
					v-for="tab in tabs"
					:key="tab.id"
					:style="{
						pointerEvents: isNavDragging ? 'none' : 'auto',
					}"
					@click.stop.prevent="activeTab = tab.name"
				>
					<!-- 可渲染tab插槽或默认label -->
					<component :is="tab.labelVNodes" :key="tab.id" />
				</div>
			</div>
			<!-- ? 向右切换控制条 -->
			<div
				ref="navRightButton"
				:data-show="showButtons && tabs.length > 0"
				class="base-tabs__nav-arrow base-tabs__nav-arrow-right"
				@click.stop.prevent="toggleTab('next')"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<g fill="none" fill-rule="evenodd">
						<path
							d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
						/>
						<path
							fill="currentColor"
							d="M15.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95l-4.95-4.95a1 1 0 0 1 1.414-1.414z"
						/>
					</g>
				</svg>
			</div>
		</div>
		<!-- 实际的渲染内容 -->
		<div class="base-tabs__content" :style="[contentStyle]">
			<!-- s Tab内容 -->
			<template v-for="tab in tabs" :key="tab.id">
				<keep-alive>
					<component
						v-if="tab.name === activeTab"
						:is="tab.defaultVNodes"
						:key="tab.id"
					/>
				</keep-alive>
			</template>
		</div>
		<teleport to="body">
			<!-- 将节点传送到body防止污染dom -->
			<div v-show="false">
				<slot></slot>
			</div>
		</teleport>
	</div>
</template>

<script lang="ts" setup>
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	onActivated,
	provide,
	reactive,
	ref,
	shallowReactive,
	useTemplateRef,
	watch,
} from "vue";
import type { CSSProperties, HTMLAttributes, VNode } from "vue";
import { symbol_BaseTabs } from "./symbol";
import {
	useDraggable,
	useElementBounding,
	useElementSize,
	useMutationObserver,
	useResizeObserver,
	useScroll,
	watchDebounced,
} from "@vueuse/core";
import type { UseElementBoundingReturn } from "@vueuse/core";

// 组件基本信息
defineOptions({
	name: "base-tabs",
});

// props
withDefaults(
	defineProps<{
		/** Tab `内容区` 的 `Style` */
		contentStyle?: HTMLAttributes["style"];
		/** 显示 Tab `切换按钮` @default false */
		showButtons?: boolean;
	}>(),
	{
		showButtons: false,
	},
);

// emits 定义
const emits = defineEmits<{
	change: [name: string];
}>();

// s 激活的tab
const activeTab = defineModel({ type: String, default: "" });

watch(activeTab, (newValue, oldValue) => {
	if (newValue !== oldValue) {
		// 当 activeTab 变化时发送 emits
		emits("change", newValue);
	}

	if (!oldValue) return;
	hoverBarTransition.value = "0.5s ease";
	requestAnimationFrame(() => {
		hoverBarTransition.value = "unset";
	});
});

// t 未注册的tab数据
export interface TabItem {
	name: string;
	label: string;
}

// t 已注册的Tab数据
interface TabItemRegistered extends TabItem {
	id: string; // 注册后创建一个唯一id
	// 默认插槽的VNodes
	defaultVNodes: {
		render: () => VNode | VNode[];
	};
	// label插槽的VNodes
	labelVNodes: {
		render: () => VNode | VNode[];
	};
}

// s 所有注册过渡tab对象
const tabs = reactive<TabItemRegistered[]>([]);

// ? 由于组件尚未实现虚拟化列表所以限制最大tab数量
const MAX_TAB_COUNT = 500;

// s 所有tabDOM对象
const tabDOMs = useTemplateRef("tabRefs");

// f 切换标签
function toggleTab(direction: "pre" | "next") {
	const currentIndex = tabs.findIndex((t) => t.name === activeTab.value);
	if (currentIndex < 0) return;
	let targetIndex = currentIndex;
	let scrollBehavior: ScrollOptions["behavior"] = "smooth";

	if (direction === "pre") {
		if (currentIndex > 0) {
			targetIndex = currentIndex - 1;
		} else {
			targetIndex = tabs.length - 1;
			scrollBehavior = "instant";
		}
	} else {
		if (currentIndex < tabs.length - 1) {
			targetIndex = currentIndex + 1;
		} else {
			targetIndex = 0;
			scrollBehavior = "instant";
		}
	}

	if (tabDOMs.value && currentIndex !== targetIndex) {
		activeTab.value = tabs[targetIndex].name;
		scrollIntoViewToTab(targetIndex, scrollBehavior);
	}
}

// f 滚动到指定tab
function scrollIntoViewToTab(
	index: number,
	behavior: ScrollOptions["behavior"] = "auto",
) {
	if (!tabDOMs.value) return;
	const tabDOM = tabDOMs.value[index];
	tabDOM?.scrollIntoView({
		behavior,
		inline: "center",
	});
}

// w 组件激活时尝试滚动到激活的tab
onActivated(() => {
	requestAnimationFrame(() => {
		const index = tabs.findIndex((t) => t.name === activeTab.value);
		scrollIntoViewToTab(index);
	});
});

// f tab注册函数
function registerTab(tab: TabItemRegistered) {
	if (tabs.length + 1 > MAX_TAB_COUNT) {
		console.warn(
			`[base-tab] 为保证性能，超出 ${MAX_TAB_COUNT} 个的 base-tab-pane 将被忽略`,
		);
		return;
	}
	// 判断是否已经注册过
	const index = tabs.findIndex((t) => t.name == tab.name);
	// console.log(index);
	// 如果已经注册过了就不重复注册
	if (index > -1) return;
	// 如果没有注册过就注册
	tabs.push(tab);
	// 然后下一个渲染时机判断是否指定默认的tab
	requestAnimationFrame(() => {
		if (tabs.length > 0 && !activeTab.value) {
			// 如果默认Tab为空或不存在则指定首个Tab为默认Tab
			activeTab.value = tabs[0].name;
		}
	});
}

// f 更新Tab
async function updateTab(
	id: string,
	{ name: newName, label: newLabel }: Partial<TabItem>,
) {
	const tab = tabs.find((t) => t.id === id);
	if (tab) {
		// 先记录旧name
		const oldName = tab.name;
		// console.log(newName);
		tab.name = newName ? newName : tab.name;
		tab.label = newLabel ? newLabel : tab.label;
		// 判断如果修改的是当前激活的tab的同时修改active
		if (oldName === activeTab.value) {
			activeTab.value = tab.name;
		}
	}
}

// f 取消Tab注册
async function unregisterTab(id: string) {
	const index = tabs.findIndex((t) => t.id === id);
	if (index >= 0) {
		const [tab] = tabs.splice(index, 1);
		// 如果删除的是当前激活的tab激活当前index-1位置的tab
		const preTab = tabs[index - 1];
		if (tab.name === activeTab.value && preTab) {
			activeTab.value = preTab.name;
		}
		// 如果tab列表为空则active置为空
		if (!tabs.length) {
			activeTab.value = "";
		}

		// 同步清除缓存
		tabBoundingCache.delete(tab.name);

		// await nextTick()
		// 先取消悬浮条的过渡动画
		hoverBarTransition.value = "unset";
		requestAnimationFrame(() => {
			// 下一帧再回复
			hoverBarTransition.value = "0.5s ease";
		});
	}
}

// ? nav 相关
const navDOM = useTemplateRef("navRef");
// s nav的尺寸
const navSize = useElementSize(navDOM);

// w 监听 nav 宽度 刷新 bounding
watchDebounced(
	[navSize.width],
	() => {
		updateTabBounding();
	},
	{
		debounce: 300,
	},
);

// s nav的Scroll尺寸
const navScrollSize = shallowReactive({
	width: 0,
	height: 0,
	left: 0,
	top: 0,
});

// 监听nav尺寸
useResizeObserver(navDOM, (entries) => {
	const entry = entries[0];
	if (!entry) return;
	navScrollSize.width = entry.target.scrollWidth;
	navScrollSize.height = entry.target.scrollHeight;
	navScrollSize.left = entry.target.scrollLeft;
	navScrollSize.top = entry.target.scrollTop;
});

// 监听nav内元素变动并更新scroll尺寸
useMutationObserver(
	navDOM,
	() => {
		if (!navDOM.value) return;
		navScrollSize.width = navDOM.value.scrollWidth;
		navScrollSize.height = navDOM.value.scrollHeight;
		navScrollSize.left = navDOM.value.scrollLeft;
		navScrollSize.top = navDOM.value.scrollTop;
	},
	{
		childList: true,
		subtree: true,
		characterData: true,
	},
);

// 监听nav的滚动并记录滚动位置
const navScroll = useScroll(navDOM, {
	behavior: "smooth",
	onScroll() {
		navScrollSize.left = navScroll.x.value;
		navScrollSize.top = navScroll.y.value;
	},
});

onUnmounted(() => {
	// 组件卸载时取消监听
	navSize.stop();
});

// w 挂载时注册tabs的nav栏滚动事件
onMounted(() => {
	navDOM.value?.addEventListener("wheel", onNavWheel, {
		// 告诉浏览器 onNavWheel 接下来要阻止默认事件
		passive: false,
	});

	onUnmounted(() => {
		navDOM.value?.removeEventListener("wheel", onNavWheel);
	});
});

// 当鼠标在nav中滚动时的事件
function onNavWheel(e: WheelEvent) {
	// 阻止默认的滚动事件
	e.preventDefault();
	if (navScroll.isScrolling.value) return;
	navDOM.value?.scrollTo({
		left: navScroll.x.value + e.deltaY,
		behavior: "smooth",
	});
}

let isNavDragging = ref(false);
onMounted(() => {
	let start = { x: 0, y: 0 };
	let scrollStart = { left: 0, top: 0 };
	useDraggable(navDOM, {
		preventDefault: true,
		stopPropagation: true,
		onStart(_, _e) {
			if (
				navScrollSize.width <= Number(navSize.width.value.toFixed(0)) &&
				navScrollSize.height <= Number(navSize.height.value.toFixed(0))
			)
				return;

			const { x, y } = _e;
			navScroll.measure();
			start = { x, y };
			scrollStart = { left: navScroll.x.value, top: navScroll.y.value };
		},
		onMove(_, _e) {
			if (
				navScrollSize.width <= Number(navSize.width.value.toFixed(0)) &&
				navScrollSize.height <= Number(navSize.height.value.toFixed(0))
			)
				return;
			isNavDragging.value = true;
			const { x, y } = _e;
			const deltaPos = {
				x: start.x - x,
				y: start.y - y,
			};
			navDOM.value?.scrollTo({
				left: scrollStart.left + deltaPos.x,
				top: scrollStart.top + deltaPos.y,
				behavior: "instant",
			});

			if (
				(navScrollSize.width != Number(navSize.width.value.toFixed(0)) &&
					scrollStart.left + deltaPos.x >= 0) ||
				(navScrollSize.height != Number(navSize.height.value.toFixed(0)) &&
					scrollStart.top + deltaPos.y >= 0)
			) {
				document.body.style.cursor = "grab";
			}
		},
		onEnd(_, _e) {
			isNavDragging.value = false;
			document.body.style.cursor = "";
		},
	});
});

// f bounding更新函数
async function updateTabBounding() {
	// if (state.isFrozen) return
	await nextTick();
	navWrapBounding.update();
	tabBoundingCache.forEach((x) => {
		x.update();
	});
}

// ? 底边悬浮条 hover-bar 相关
const navWrapDOM = useTemplateRef("navWrapRef");
const navWrapBounding = useElementBounding(navWrapDOM);

// bounding 缓存
const tabBoundingCache = shallowReactive(
	new Map<string, UseElementBoundingReturn>(),
);
// 组件卸载时清除缓存
onUnmounted(() => tabBoundingCache.clear());
// 被激活的tab的bounding尺寸
const activeTabBounding = computed(() => {
	if (!activeTab.value) return;
	const index = tabs.findIndex((t) => t.name === activeTab.value);
	if (index > -1) {
		const name = tabs[index].name;
		if (tabBoundingCache.has(name)) {
			return tabBoundingCache.get(name);
		} else {
			if (!tabDOMs.value || !tabDOMs.value.length) return;
			const tabDOM = tabDOMs.value[index];
			const bounding = useElementBounding(tabDOM, { reset: false });
			tabBoundingCache.set(name, bounding);
			return bounding;
		}
	} else {
		return;
	}
});

// j 动态计算 hover-bar 尺寸
const hoverBarStyle = computed<CSSProperties>(() => {
	// 判断有没有激活元素
	if (activeTabBounding.value) {
		const { x, width } = activeTabBounding.value;
		return {
			left: `${x.value - navWrapBounding.x.value}px`,
			bottom: `${0}px`,
			width: `${width.value}px`,
			height: `${2}px`,
		};
	} else {
		return { left: 0, bottom: 0, width: 0, height: 0 };
	}
});

// hoverBar 的过渡属性
const hoverBarTransition = ref<CSSProperties["transition"]>("");

// ? 提供给子组件base-tab-pane使用的方法和属性
const provideObj = {
	registerTab,
	updateTab,
	unregisterTab,
	active: activeTab,
	tabs: tabs,
};
// 导出提供的provide类型
export type provideType = typeof provideObj;
// 调用provide方法
provide(symbol_BaseTabs, provideObj);
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

.base-tabs__container {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
}

.base-tabs__nav {
	flex-shrink: 0;
	display: flex;
	overflow-x: auto;
	overflow-y: hidden;
	user-select: none;

	&::-webkit-scrollbar {
		display: none;
	}
}

.base-tabs__nav-wrap {
	position: relative;
	width: fit-content;
	display: flex;

	/* ? nav-wrap 的下方的装饰线 */
	&::before {
		content: "";
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 1px;
		background-color: #ccc;

		/* 暗黑主题切换 */
		@media (prefers-color-scheme: dark) {
			background-color: hsl(228, 3%, 31%);
		}
	}

	/* ? 底边悬浮条 */
	&::after {
		content: "";
		position: absolute;
		width: v-bind("hoverBarStyle.width");
		height: v-bind("hoverBarStyle.height");
		left: v-bind("hoverBarStyle.left");
		bottom: v-bind("hoverBarStyle.bottom");
		background-color: #409eff;
		transition: v-bind("hoverBarTransition");
	}
}

/* 控制按钮 */
.base-tabs__nav-arrow {
	position: sticky;
	/* background-color: #409eff; */
	display: flex;
	align-items: center;
	justify-content: center;
	/* z-index: 1; */
	transition: 0.5s ease;

	width: 0;
	flex-shrink: 0;

	cursor: pointer;

	svg {
		z-index: 1;
		height: 0;
	}

	&[data-show="true"] {
		width: 24px;
		svg {
			height: 100%;
		}
	}

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		backdrop-filter: blur(4px);
		transition: 0.5s ease;
	}

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: 0.5s ease;
	}

	&:hover::after {
		opacity: 1;
	}

	&.base-tabs__nav-arrow-left {
		left: 0;
		z-index: 1;
		&::after {
			background: linear-gradient(
				to right,
				hsla(210, 100%, 63%, 0.8),
				hsla(210, 100%, 63%, 0)
			);
		}
	}
	&.base-tabs__nav-arrow-right {
		right: 0;
		margin-left: auto;
		&::after {
			background: linear-gradient(
				to left,
				hsla(210, 100%, 63%, 0.8),
				hsla(210, 100%, 63%, 0)
			);
		}
	}
}

.base-tabs__tab-item {
	padding: 0px 16px;
	line-height: 2;
	text-wrap: nowrap;
	cursor: pointer;
	user-select: none;

	transition: color 0.5s ease;
	&:hover {
		color: hsl(210, 100%, 63%);
	}
}

.base-tabs__tab-item.active {
	color: hsl(210, 100%, 63%);
}

.base-tabs__content {
	flex: 1;
	overflow: auto;
}
</style>
