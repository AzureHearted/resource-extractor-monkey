<template>
	<div class="base-tabs__container">
		<!-- s tab栏  -->
		<div class="base-tabs__tabs">
			<div
				class="base-tabs__tabs-wrap"
				ref="tabsWrapDOM"
				@mouseleave="updateHoverBar"
			>
				<div
					v-for="tab in tabs"
					:key="tab.id"
					ref="tabDOMs"
					:title="tab.title"
					:id="tab.id"
					class="base-tabs__tab"
					:class="{
						'active-tab': tab.id === active,
						'disable-tab': tab.disable,
					}"
					@mouseenter="!tab.disable && updateHoverBar($event)"
					@click="handleActive(tab)"
				>
					<div class="base-tabs__tab__label">
						<component
							v-if="tab.customTab"
							:is="tab.customTab"
							:key="tab.customTab"
						></component>
						<template v-else>
							{{ tab.title }}
						</template>
					</div>
				</div>
			</div>
			<div class="base-tabs__other-bar-wrap" v-if="tabs.length">
				<!-- s 浮动条 -->
				<div class="base-tabs__hover-bar" :style="hoverBarStyle"></div>
				<!-- s 激活条  -->
				<div class="base-tabs__active-bar" :style="activeBarStyle"></div>
			</div>
		</div>
		<!-- s 内容区 -->
		<div class="base-tabs__content-wrap" :style="[wrapStyle]">
			<template v-for="tab in tabs" :key="tab">
				<keep-alive>
					<component v-if="tab.id === active" :is="tab.vnode" :key="tab.id" />
				</keep-alive>
			</template>
			<BaseTabPane name="empty" v-if="!tabs.length">
				<el-empty description="description" />
			</BaseTabPane>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useMutationObserver } from "@vueuse/core";
import {
	ref,
	computed,
	onMounted,
	watch,
	onUnmounted,
	onActivated,
	useSlots,
	nextTick,
} from "vue";
import type { HtmlHTMLAttributes } from "vue";
import type { VNode, HTMLAttributes } from "vue";
import BaseTabPane from "./base-tab-pane.vue";

withDefaults(
	defineProps<{
		wrapStyle?: HtmlHTMLAttributes["style"];
	}>(),
	{}
);

const emits = defineEmits<{
	(e: "tab-active", tabName: string): void;
}>();

const slots = useSlots();

// j 获取传入默认插槽中的tab-pane组件
const tabPanes = computed(() => {
	return slots.default
		? slots
				.default()
				.filter(
					({ props, type }) =>
						props && (type as any)?.__name === "base-tab-pane"
				)
		: [];
});

// onMounted(() => {
// 	console.log(tabPanes.value);
// });

interface Tab {
	id: string;
	name: string;
	title: string;
	disable: boolean;
	vnode: VNode;
	customTab: Function | undefined;
}

// j tabs选项
const tabs = computed<Tab[]>(() => {
	return tabPanes.value.map((vnode) => {
		const { props, children } = vnode;
		const { name, title, disable } = props!;
		const { tab }: { tab: Function | undefined } = children || ({} as any);
		return {
			id: crypto.randomUUID(),
			name,
			title: title || name,
			disable: disable === "" ? true : disable || false,
			vnode,
			customTab: tab,
		};
	});
});

// s 当前激活的tab
const active = ref("");

function handleActive(tab: Tab) {
	if (!tab.disable) {
		active.value = tab.id;
	}
}

watch(active, (nowId) => {
	if (!nowId.trim()) return;
	const tab = tabs.value.find((c) => c.id === nowId);
	if (!tab) return;
	emits("tab-active", tab.name);
});

// 挂载后设置默认激活的tab
onMounted(() => {
	// console.log("slots", tabs.value, tabPanes.value);
	if (tabs.value.length) {
		active.value = tabs.value[0].id;
	}
	updateActiveBar();
});

// s tabs的容器DOM
const tabsWrapDOM = ref<HTMLElement | null>(null);
// s tabsDOM列表
const tabDOMs = ref<HTMLElement[] | null>(null);

// j 被激活的tabDOM
const activeTabDOM = computed<HTMLElement | undefined>(() => {
	if (!tabDOMs.value) return;
	const index = tabs.value.findIndex((x) => x.id === active.value);
	return tabDOMs.value[index];
});
// j 激活条样式
const activeBarStyle = ref<HTMLAttributes["style"]>();

onMounted(() => {
	updateActiveBar(); // 挂载时立即刷新
	onUnmounted(() => observer.stop()); // 卸载时停止监听器
	onActivated(() => observer.reset()); // 当组件被激活时刷新
	// s 创建监听器
	const observer = createObserver();
	// f 设置监听器
	function createObserver() {
		let stopFuncList: Function[] = [];
		function set() {
			const { stop } = useMutationObserver(
				tabsWrapDOM.value,
				() => {
					updateActiveBar();
				},
				{
					attributes: true,
					// characterData: true,
					subtree: true,
				}
			);
			// f 记录监听器
			stopFuncList.push(stop);
			// console.log("创建监听器");
		}
		function reset() {
			// console.log("重新设置监听器");
			set();
		}
		function stop() {
			// console.log("监听器卸载");
			stopFuncList.forEach((f) => f());
		}
		reset();
		return { reset, stop };
	}
});

// f 更新激活条样式
const updateActiveBar = () => {
	if (!activeTabDOM.value || !tabsWrapDOM.value) return;
	const { left: wrapLeft } = tabsWrapDOM.value.getBoundingClientRect();
	const { width, left } = activeTabDOM.value.getBoundingClientRect();
	activeBarStyle.value = {
		width: `${width}px`,
		left: `${left - wrapLeft}px`,
	};
	nextTick(() => {
		updateHoverBar();
	});
};

// j 浮动条样式
const hoverBarStyle = ref<HTMLAttributes["style"]>();

onMounted(() => {
	// s 挂载(激活)时将激活条的样式赋值给悬浮条
	updateHoverBar();
	onActivated(() => {
		updateHoverBar();
	});
});

watch(activeBarStyle, (value) => {
	hoverBarStyle.value = value;
});

// f 更新浮动条样式
const updateHoverBar = (e?: MouseEvent) => {
	if (!tabDOMs.value || !tabsWrapDOM.value || !activeTabDOM.value) return;
	// console.log(hoverTabDOM.children);
	const { left: wrapLeft } = tabsWrapDOM.value.getBoundingClientRect();
	if (e && e.type === "mouseenter") {
		// 选寻找被悬浮的元素
		const hoverTabDOM = e.target as HTMLElement;
		const hoverTabLabelDOM = hoverTabDOM.children[0];
		const targetDOM = hoverTabLabelDOM || hoverTabLabelDOM;
		const { width, left } = targetDOM.getBoundingClientRect();
		hoverBarStyle.value = {
			width: `${width}px`,
			left: `${left - wrapLeft}px`,
		};
	} else {
		// console.log(e.type);
		if (!activeTabDOM.value) return;
		const { width, left } = activeTabDOM.value.getBoundingClientRect();
		hoverBarStyle.value = {
			width: `${width}px`,
			left: `${left - wrapLeft}px`,
		};
	}
};
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}
$active-color: rgb(24, 160, 88);
.base-tabs__container {
	// background: wheat;
	display: flex;
	flex-flow: column nowrap;
}
// s tabs容器样式
.base-tabs__tabs {
	position: sticky;
	top: 0;
}
// s tabs包裹容器
.base-tabs__tabs-wrap {
	display: flex;
	flex-flow: row;
}
// s tab容器样式
.base-tabs__tab {
	padding: 2px 8px;
	z-index: 1;
	color: rgb(31, 34, 37);

	transition: 0.3s ease-in-out;

	&.active-tab {
		color: $active-color;
	}

	&.disable-tab {
		color: rgb(194, 194, 194);
		cursor: not-allowed;

		.base-tabs__tab__label {
			cursor: not-allowed;
		}
	}

	// s tab标签样式
	.base-tabs__tab__label {
		// border-bottom: 1px solid black;
		font-size: 14px;
		padding-bottom: 4px;
		user-select: none;
		cursor: pointer;
	}
}

// s 辅助条包裹容器
.base-tabs__other-bar-wrap {
	z-index: -1;
}

// s 激活条样式
.base-tabs__active-bar {
	position: absolute;
	pointer-events: none;
	left: 0;
	bottom: 0;
	transition: 0.3s ease-in-out;
}

// s 浮动条样式
.base-tabs__hover-bar {
	position: absolute;
	pointer-events: none;
	left: 0;
	bottom: 2px;
	height: 100%;
	border-bottom: 2px solid $active-color;
	transition: 0.3s ease-in-out;
	z-index: 1;
}

// s 主要内容区
.base-tabs__content-wrap {
	flex: 1; // 填满剩余空间
	display: flex;
	// background-color: rgb(255, 255, 255);
	transition: 0.3s;
}
</style>
