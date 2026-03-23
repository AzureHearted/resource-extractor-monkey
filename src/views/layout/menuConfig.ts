type MenuKey =
	| "Gallery"
	| "PatternEdit"
	| "Favorite"
	| "Setting"
	| "AutoPage"
	| "Test";

interface MenuConfig {
	label: string;
	key: MenuKey;
	icon: string;
}

// 菜单配置
export const menuConfig: MenuConfig[] = [
	{ label: "图库", key: "Gallery", icon: "material-symbols:gallery-thumbnail" },
	{ label: "方案管理", key: "PatternEdit", icon: "material-symbols:box-edit" },
	{ label: "收藏", key: "Favorite", icon: "mdi:favorite" },
	{ label: "设置", key: "Setting", icon: "ant-design:setting-twotone" },
	{
		label: "自动翻页设置",
		key: "AutoPage",
		icon: "material-symbols:two-pager",
	},
	{
		label: "测试页面",
		key: "Test",
		icon: "material-symbols:experiment-outline",
	},
] as const;

/**
 * 拿到图片组件名
 * @param icon 图标名
 * @param prefix 前缀 默认是 "i-" ，此处不需要加 "-" @default "i"
 * @returns
 */
export function getIconComponentName(icon: string, prefix: string = "i") {
	return `${prefix}-${icon.replace(/:/g, "-")}`;
}
