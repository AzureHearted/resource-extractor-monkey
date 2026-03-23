<template>
	<n-menu
		v-model:value="activeKey"
		:collapsed="collapsed"
		:collapsed-width="64"
		:collapsed-icon-size="24"
		:indent="16"
		:render-label="renderLabel"
		:options="menuOptions"
		@update:value="select"
	/>
</template>

<script setup lang="ts">
import { h } from "vue";
import { Icon } from "@iconify/vue";
import { NIcon } from "naive-ui";
import type { MenuOption, MenuProps } from "naive-ui";

import { storeToRefs } from "pinia";
import { useGlobalStore } from "@/stores";
import { menuConfig } from "./menuConfig";
const globalStore = useGlobalStore();
const { tab: activeKey, navCollapse: collapsed } = storeToRefs(globalStore);

const emits = defineEmits<{
	(e: "select", key: string): void;
}>();

// f 菜单选项变化时的回调
const select: MenuProps["onSelect"] = (key) => {
	emits("select", key);
};

// 导航菜单选项
const menuOptions: MenuOption[] = menuConfig.map((m) => {
	return {
		...m,
		icon: renderIcon(m.icon),
	};
});

// f 图标渲染函数
function renderIcon(icon: string) {
	return () => h(NIcon, {}, { default: () => h(Icon, { icon }) });
}

// f 标签渲染函数
const renderLabel: MenuProps["renderLabel"] = ({ label }) => {
	return h("div", { title: label }, { default: () => label });
};
</script>

<style lang="scss" scoped></style>
