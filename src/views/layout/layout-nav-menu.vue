<template>
	<n-menu
		v-model:value="activeKey"
		:collapsed="collapsed"
		:collapsed-width="64"
		:collapsed-icon-size="24"
		:indent="16"
		:render-label="renderLabel"
		:options="menuOptions"
		@update:value="select" />
</template>

<script setup lang="ts">
	import { h } from "vue";
	import { Icon } from "@iconify/vue";
	import { NIcon, NEllipsis } from "naive-ui";
	import type { MenuOption, MenuProps } from "naive-ui";

	const emits = defineEmits<{
		(e: "select", key: string): void;
	}>();

	// f 菜单选项变化时的回调
	const select: MenuProps["onSelect"] = (key) => {
		emits("select", key);
	};

	import { storeToRefs } from "pinia";
	import useGlobalStore from "@/stores/GlobalStore";
	const globalStore = useGlobalStore();
	const { tab: activeKey, navCollapse: collapsed } = storeToRefs(globalStore);

	// 导航菜单选项
	const menuOptions: MenuOption[] = [
		{
			label: "图库",
			key: "Gallery",
			icon: renderIcon("material-symbols:gallery-thumbnail"),
		},
		{
			label: "方案管理",
			key: "PatternEdit",
			icon: renderIcon("material-symbols:box-edit"),
		},
		{
			label: "收藏",
			key: "Favorite",
			icon: renderIcon("mdi:favorite"),
		},
		{
			label: "设置",
			key: "Setting",
			icon: renderIcon("ant-design:setting-twotone"),
		},
		{
			label: "自动翻页设置",
			key: "AutoPage",
			icon: renderIcon("material-symbols:two-pager"),
		},
		{
			label: "测试页面",
			key: "Test",
			icon: renderIcon("material-symbols:experiment-outline"),
		},
	];

	// 图标渲染
	function renderIcon(icon: string) {
		return () => h(NIcon, {}, { default: () => h(Icon, { icon }) });
	}

	// 标签渲染
	const renderLabel: MenuProps["renderLabel"] = ({ label }) => {
		return h("div", { title: label }, { default: () => label });
	};
</script>

<style lang="scss" scoped></style>
