<!-- 什么都不需要渲染 -->
<template></template>

<script setup lang="ts">
import {
	inject,
	getCurrentInstance,
	markRaw,
	onMounted,
	watch,
	onUnmounted,
} from "vue";
import type { provideType } from "./base-tabs.vue";
import { symbol_BaseTabs } from "./base-tabs-symbol";

// 注入base-tabs提供的方法和属性
const { updateTab, registerTab, unregisterTab, tabs } = inject<provideType>(
	symbol_BaseTabs,
	{} as provideType
);

// 组件基本信息
defineOptions({
	name: "base-tab-pane",
});

// 定义插槽
const slots = defineSlots<{
	default(props: {}): any;
	label(props: {}): any;
}>();

// props 定义
const props = defineProps({
	name: { type: String, required: true },
	label: { type: String, required: false },
});

// 组件id
const id = crypto.randomUUID();

// 监听props
watch(
	[() => props.name, () => props.label],
	([newName, newLabel], [_oldName, _oldLabel]) => {
		if (updateTab) updateTab(id, { name: newName, label: newLabel });
	}
);

// 组件挂载时
onMounted(() => {
	const instance = getCurrentInstance();
	const parentType = instance?.parent?.type.name;

	// 防止组件没有再 base-tabs 组件下正确使用
	if (!parentType || parentType !== "base-tabs") {
		if (parentType === "base-tab-pane") {
			console.warn(`[base-tab-pane] 该组件不允许嵌套`);
			return;
		}
		console.warn(`[base-tab-pane] 请确保在 "base-tabs" 使用`);
		return;
	}
	// 防止重复注册相同 name 的组件
	if (tabs && tabs.findIndex((t) => t.name === props.name) > -1) {
		console.warn(`[base-tab-pane] 不允许重复注册 name 属性相同的 tab`);
		return;
	}

	// 创建注册对象
	const tabItem: Parameters<typeof registerTab>["0"] = {
		id: id,
		name: props.name,
		label: props.label || props.name,
		// ? 使用markRaw包装对象告诉 Vue，这个对象不要被响应式系统代理
		defaultVNodes: markRaw({
			render() {
				if (slots.default) {
					return slots.default({});
				} else {
					return [];
				}
			},
		}),
		labelVNodes: markRaw({
			render: () => {
				if (slots.label) {
					return slots.label({});
				} else {
					// 如果没有传入tab插槽则默认使用props.label
					return props.label;
				}
			},
		}),
	};

	// 调用父组件提供的tab注册函数注册tab
	if (registerTab) registerTab(tabItem);
});

// 组件卸载时通知父组件取消注册
onUnmounted(() => {
	unregisterTab(id);
});
</script>
