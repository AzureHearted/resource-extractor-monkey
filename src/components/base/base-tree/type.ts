interface BaseTreeNodeItem {
	id: string
	label: string
	/** 是否为叶子节点 */
	isLeaf?: boolean
	/** 是否展开 */
	expanded?: boolean
	/** 是否正在加载 */
	loading?: boolean
	/** 节点层级 */
	level?: number
	children?: BaseTreeNodeItem[]
	/** 父节点id (如果是根节点则为空) */
	pid?: string
	/** 其他节点在当前节点悬浮位置的状态  */
	dragoverState?: 'before' | 'inside' | 'after'
	/** 显示添加按钮 */
	showAddButton?: boolean
	/** 显示编辑按钮 */
	showEditButton?: boolean
	/** 显示删除按钮 */
	showDeleteButton?: boolean
}
