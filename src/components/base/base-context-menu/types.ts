interface MenuOption<T = any> {
	/** 菜单标签  */
	label: string
	/** 菜单命令 */
	command: T
	/** 禁用 @default false */
	disable?: boolean
	/** 隐藏 @default false */
	hidden?: boolean
}
