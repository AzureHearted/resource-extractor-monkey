<template>
	<div class="pattern-tree__container">
		<el-card>
			<div class="pattern-tree__button-group-list">
				<el-button-group class="pattern-tree__button-group">
					<el-button type="primary" @click="createPattern">
						<template #icon>
							<icon-material-symbols-list-alt-add />
						</template>
						新建方案
					</el-button>
					<el-button type="success" @click="pastePattern">
						<template #icon>
							<icon-material-symbols-content-paste-search-rounded />
						</template>
						粘贴方案
					</el-button>
				</el-button-group>
			</div>
		</el-card>
		<el-card>
			<el-input
				class="pattern-tree-filter-input"
				clearable
				v-model="filterText"
				placeholder="输入关键词"
			>
			</el-input>
		</el-card>
		<div class="pattern-tree__tree">
			<BaseScrollbar :show-back-top-button="false">
				<el-tree
					ref="treeRef"
					:data="treeData"
					:props="defaultProps"
					:allow-drop="allowDrop"
					:allow-drag="allowDrag"
					draggable
					node-key="id"
					:indent="14"
					show-checkbox
					:expand-on-click-node="false"
					check-strictly
					highlight-current
					:current-node-key="currentNodeKey"
					default-expand-all
					:filter-node-method="filterNode"
					@node-click="handleNodeClick"
					@node-drop="handleDrop"
				>
					<template #default="{ node, data }">
						<span class="custom-tree-node">
							<!-- 节点名称区域 -->
							<div class="custom-tree-node-left">
								<!-- 节点图标(图片) -->
								<span class="custom-tree-node-icon">
									<BaseImg
										v-if="data.type === 'pattern' && !data.id.includes('#')"
										style="width: 16px; height: 16px"
										:src="(data.rowData as Pattern).backup?.mainInfo.icon"
									>
									</BaseImg>
									<el-icon v-if="data.type === 'rule'">
										<icon-material-symbols-regular-expression-rounded />
									</el-icon>
								</span>
								<!-- 节点名称 -->
								<el-tooltip
									:content="node.label"
									placement="right"
									:enterable="false"
								>
									<el-badge
										class="custom-tree-node-name"
										is-dot
										:offset="[-4, 4]"
										:hidden="!(data.rowData as Pattern|Rule).isChange()"
									>
										{{ node.label }}
									</el-badge>
								</el-tooltip>
							</div>
							<!-- 操作按钮 -->
							<div class="custom-tree-node-right" v-if="!data.id.includes('#')">
								<!-- 添加规则 -->
								<el-button
									v-if="data.type === 'pattern'"
									type="success"
									size="small"
									circle
									@click.stop="addRule(node, data)"
								>
									<template #icon>
										<icon-ep-plus />
									</template>
								</el-button>
								<!-- 删除按钮 -->
								<el-popconfirm
									title="确定删除?"
									:hide-after="0"
									confirm-button-text="是"
									cancel-button-text="否"
									@confirm="
										data.type === 'pattern'
											? removePattern(node, data)
											: removeRule(node, data)
									"
								>
									<template #reference>
										<el-button type="danger" size="small" circle @click.stop>
											<template #icon>
												<icon-material-symbols-delete-rounded />
											</template>
										</el-button>
									</template>
								</el-popconfirm>
							</div>
						</span>
					</template>
				</el-tree>
			</BaseScrollbar>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import BaseImg from "@/components/base/base-img.vue";
import type { ElTree } from "element-plus";
import type Node from "element-plus/es/components/tree/src/model/node";
// import type { DragEvents } from "element-plus/es/components/tree/src/model/useDragNode";
import type {
	AllowDropType,
	NodeDropType,
} from "element-plus/es/components/tree/src/tree.type";
import { Pattern } from "@/stores/PatternStore/class/Pattern";
import { Rule } from "@/stores/PatternStore/class/Rule";

import { storeToRefs } from "pinia";
import usePatternStore from "@/stores/PatternStore";

const patternStore = usePatternStore();
const { createPattern, deletePattern, findPattern, pastePattern } =
	patternStore;

// 定义Tree节点结构
interface Tree {
	id: string;
	label: string;
	type: "pattern" | "rule";
	children?: Tree[];
	rowData: Pattern | Rule;
	[key: string]: any;
}
// 默认参数映射
const defaultProps = {
	children: "children",
	label: "label",
	disabled: "disabled",
};

// 列表数据
// const treeData = ref<Tree[]>([]);
const treeData = computed<Tree[]>(() => {
	return patternStore.list.map((p) => {
		return {
			id: p.id,
			label: p.mainInfo.name,
			type: "pattern",
			disabled: p.id.includes("#"),
			rowData: p,
			children: p.rules.map((r) => {
				return {
					id: r.id,
					label: r.name,
					type: "rule",
					rowData: r,
					disabled: r.id.includes("#"),
				};
			}),
		} as Tree;
	});
});

// 过滤关键词
const filterText = ref("");
// tree组件的DOM
const treeRef = ref<InstanceType<typeof ElTree>>();
//当前选中的节点
const currentNodeKey = computed<string>(() => {
	const { editingPattern, editingRule } = storeToRefs(patternStore);
	if (editingPattern.value) {
		if (editingPattern.value.rules.length) {
			return editingPattern.value.rules[0].id;
		} else {
			return editingPattern.value.id;
		}
	} else if (editingRule.value) {
		return editingRule.value.id;
	} else {
		return "#";
	}
});

// 监听过滤关键词变化
watch(filterText, (val) => {
	treeRef.value!.filter(val);
});

// 过滤Tree节点函数
const filterNode: any = (value: string, data: Tree) => {
	if (!value) return true;
	return data.label.includes(value);
};

// 拖拽相关
// 判断是否允许拖拽
const allowDrag = (draggingNode: Node): boolean => {
	const data = draggingNode.data.rowData as Pattern | Rule;
	return !data.id.includes("#") && !data.state.editing;
};
// 判断是否允许放置
const allowDrop = (
	draggingNode: Node, // 拖拽中的节点
	dropNode: Node, // 放置节点
	type: AllowDropType // 放置位置
): boolean => {
	// console.log("type", type);
	if (draggingNode.id === dropNode.id || dropNode.data.rowData.id.includes("#"))
		return false; // 不允许放置到内部
	// console.log(draggingNode, dropNode, type);
	// return false;
	if (type === "inner") {
		// 只能允许"规则节点"拖动到"方案节点"内部
		return (
			draggingNode.data.type === "rule" && dropNode.data.type === "pattern"
		);
	} else {
		return dropNode.data.type === draggingNode.data.type;
	}
};

// 处理拖拽放置事件
const handleDrop = (
	draggingNode: Node,
	dropNode: Node,
	dropType: NodeDropType
	// ev: DragEvents
) => {
	if (dropType === "none") return;
	// 将"规则"拖拽到指定"方案"中
	if (
		dropType === "inner" &&
		draggingNode.data.type === "rule" &&
		dropNode.data.type === "pattern"
	) {
		const draggingRule = draggingNode.data.rowData as Rule;
		const dropPattern = dropNode.data.rowData as Pattern;
		patternStore.moveRuleToPattern(draggingRule.id, dropPattern.id);
	}

	// 将规则间拖拽(可能跨方案)
	if (draggingNode.data.type === "rule" && dropNode.data.type === "rule") {
		const draggingRule = draggingNode.data.rowData as Rule;
		const dropRule = dropNode.data.rowData as Rule;
		patternStore.adjustRulePosition(draggingRule.id, dropRule.id, dropType);
	}

	// 方案间拖拽
	if (
		draggingNode.data.type === "pattern" &&
		dropNode.data.type === "pattern"
	) {
		// 方案排序
		const draggingPattern = draggingNode.data.rowData as Pattern;
		const dropPattern = dropNode.data.rowData as Pattern;
		patternStore.adjustPatternPosition(
			draggingPattern.id,
			dropPattern.id,
			dropType as any
		);
	}
};

// 节点点击时的回调
const handleNodeClick = (data: Tree, node: Node) => {
	// console.log("点击Tree节点", data, data.type);
	// 判断节点类型
	if (data.type === "rule") {
		// 如果点击的是“规则”节点
		const parent = node.parent.data as Tree;
		const patternId = parent.id;
		// emits("node-click", patternId, data.id);
		patternStore.editing.pid = patternId;
		patternStore.editing.rid = data.id;
		// currentNodeKey.value = data.id;
	} else {
		// 如果点击的是"方案"节点
		const patternId = data.id;
		patternStore.editing.pid = patternId;
		patternStore.editing.rid = "";
		// 查询是否含义“规则”节点
		const pattern = findPattern(patternId);
		if (pattern?.rules.length) {
			patternStore.editing.rid = pattern.rules[0].id;
			// currentNodeKey.value = pattern.rules[0].id;
		} else {
			// currentNodeKey.value = patternId;
		}
		// emits("node-click", patternId);
	}
};

// 删除方案
function removePattern(_node: Node, data: Tree) {
	// console.log("删除方案节点", node, data);
	deletePattern(data.id);
}

// 添加规则
function addRule(_node: Node, data: Tree) {
	// console.log("添加规则", node, data);
	// 获取方案index
	const index = patternStore.list.findIndex((p) => p.id === data.id);
	// 找到方案
	const pattern = patternStore.list[index];
	// 如果成功找到方案就调用该方案的创建规则方法
	if (pattern) {
		pattern.createRule();
	}
}

// 删除规则
function removeRule(node: Node, data: Tree) {
	// console.log("删除规则节点", node, data);
	const parent = node.parent.data;
	// 获取方案index
	const patternIndex = patternStore.list.findIndex((p) => p.id === parent.id);
	// 找到方案
	const pattern = patternStore.list[patternIndex];
	if (!pattern) return;
	// 调用方案中的删除规则方法删除规则
	pattern.deleteRule(data.id);
}
</script>

<style lang="scss" scoped>
.pattern-tree__container {
	display: flex;
	flex-flow: column;
	gap: 6px;
	height: 100%;
	:deep(.wic2-card__body) {
		padding: 4px;
	}

	.pattern-tree__button-group-list {
		display: flex;
		flex-flow: row wrap;
		gap: 4px;
	}

	.pattern-tree__tree {
		flex: 1;
		overflow: hidden;
		display: flex;
		// 必须设置方向这样虚拟滚动条才生效
		flex-direction: column;
		border-radius: 4px;

		:deep(.base-scrollbar__wrap) {
			border-radius: 4px;
			// background: #ffffff;
		}
		:deep(.base-scrollbar__view) {
			box-shadow: var(--wic2-box-shadow-light);
			border-radius: 4px;
			overflow: hidden;
			// background: #ffffff;
		}

		.pattern-tree-filter-input {
			position: sticky;
			top: 0;
		}
	}
}

// 自定义节点样式
.custom-tree-node {
	position: relative;
	flex: auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 14px;
	overflow: hidden;
	padding-right: 8px;

	// 左侧
	.custom-tree-node-left {
		flex: 1 auto;
		display: flex;
		// background: yellow;
		padding-right: 4px;

		overflow: hidden;

		// 图标
		.custom-tree-node-icon {
			flex: 0;
			display: flex;
			align-items: center;
			margin-right: 1px;
		}
		// 节点名称
		.custom-tree-node-name {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
	// 右侧
	.custom-tree-node-right {
		flex: 0 0;
		padding: 0 4px;
		display: flex;

		:deep(.wic2-button) {
			font-size: 16px;
		}
	}
}

:deep(.wic2-tree) {
	--wic2-tree-node-content-height: 40px;
	.wic2-tree-node__content {
		position: relative;
		box-sizing: border-box;
	}
	.wic2-button + .wic2-button {
		margin-left: 4px;
	}
}
</style>
