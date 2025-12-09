<template>
	<div class="pattern-tree__container">
		<n-card content-style="padding:2px">
			<n-button-group>
				<n-button type="info" @click="createPattern">
					新建方案
					<template #icon>
						<icon-material-symbols-list-alt-add />
					</template>
				</n-button>
				<n-button type="primary" @click="pastePattern">
					粘贴方案
					<template #icon>
						<icon-material-symbols-content-paste-search-rounded />
					</template>
				</n-button>
			</n-button-group>
		</n-card>
		<n-input v-model:value="keyword" placeholder="搜索" />
		<n-switch v-model:value="showIrrelevantNodes">
			<template #checked> 展示无关节点 </template>
			<template #unchecked> 隐藏无关节点 </template>
		</n-switch>
		<BaseScrollbar class="pattern-tree__tree" :show-back-top-button="false">
			<n-tree
				ref="treeRef"
				:data="data"
				key-field="id"
				block-line
				draggable
				show-line
				expand-on-click
				:pattern="keyword"
				:default-expanded-keys="defaultExpandedKeys"
				:default-selected-keys="defaultSelectedKeys"
				:show-irrelevant-nodes="showIrrelevantNodes"
				:allow-drop="allowDrop"
				:node-props="nodeProps"
				:render-label="renderLabel"
				@dragstart="dragstart"
				@drop="handleDrop"
				checkable
			>
			</n-tree>
		</BaseScrollbar>
	</div>
</template>

<script setup lang="ts">
import { h, ref, computed, useTemplateRef } from "vue";
import { NButton } from "naive-ui";
import type { TreeOption, TreeDropInfo, TreeProps } from "naive-ui";
import { DeleteFilled, Plus } from "@element-plus/icons-vue";
import { ElButton, ElPopconfirm } from "element-plus";
import { Pattern } from "@/stores/PatternStore/class/Pattern";
import { Rule } from "@/stores/PatternStore/class/Rule";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import BaseImg from "@/components/base/base-img.vue";

import usePatternStore from "@/stores/PatternStore";
const patternStore = usePatternStore();
const {
	createPattern,
	deletePattern,
	pastePattern,
	adjustPatternPosition,
	adjustRulePosition,
	moveRuleToPattern,
} = patternStore;

const treeRef = useTemplateRef("treeRef");

const keyword = ref(""); //关键词
const showIrrelevantNodes = ref(false); //展示无关节点
const defaultExpandedKeys = ref<string[]>([patternStore.editing.pid]); // 默认展开的节点
const defaultSelectedKeys = ref<string[]>([patternStore.editing.rid]); // 默认选中的节点

// 关键数据结构定义
interface PatternNode extends TreeOption {
	id: string;
	type: "pattern";
	index: number;
	rowData: Pattern;
}
interface RuleNode extends TreeOption {
	id: string;
	type: "rule";
	index: number;
	pid: string;
	pIndex: number;
	rowData: Rule;
}

// tree节点数据
const data = computed<PatternNode[]>(() => {
	return patternStore.list.map((p, pIndex) => {
		return {
			id: p.id,
			index: pIndex,
			label: p.mainInfo.name,
			type: "pattern",
			rowData: p,
			checkboxDisabled: p.id.includes("#"),
			children: p.rules.map((r, rIndex) => {
				return {
					id: r.id,
					index: rIndex,
					pid: p.id,
					pIndex,
					label: r.name,
					type: "rule",
					rowData: r,
					checkboxDisabled: true,
					// (规则后缀)渲染函数
					suffix:
						p.id.includes("#") || p.rules.length <= 1
							? null
							: () => {
									// s 删除规则按钮
									return h(
										ElPopconfirm,
										{
											title: "确定删除?",
											hideAfter: 0,
											confirmButtonText: "是",
											cancelButtonText: "否",
											onConfirm: (e) => {
												e.stopPropagation();
												p.deleteRule(r.id); // 删除规则
												// console.log(defaultSelectedKeys.value, r.id);
											},
										},
										{
											reference: () =>
												h(ElButton, {
													circle: true,
													size: "small",
													type: "danger",
													icon: DeleteFilled,
													onClick: (e) => e.stopPropagation(),
													style: {
														margin: "2px",
													},
												}),
										}
									);
							  },
				} as RuleNode;
			}),
			// (方案前缀)渲染函数
			prefix: p.id.includes("#")
				? null
				: () => {
						return h(BaseImg, {
							src: p.mainInfo.icon,
							style: "width: 16px; height: 16px",
						});
				  },
			// (方案后缀)渲染函数
			suffix: p.id.includes("#")
				? null
				: () => {
						return [
							// s 添加规则按钮
							h(ElButton, {
								circle: true,
								size: "small",
								type: "success",
								icon: Plus,
								onClick: (e) => {
									e.stopPropagation();
									p.rules.push(new Rule());
								},
								style: {
									margin: "2px",
								},
							}),
							// s 删除方案按钮
							h(
								ElPopconfirm,
								{
									title: "确定删除?",
									hideAfter: 0,
									confirmButtonText: "是",
									cancelButtonText: "否",
									onConfirm: (e) => {
										e.stopPropagation();
										deletePattern(p.id);
									},
								},
								{
									reference: () =>
										h(ElButton, {
											circle: true,
											size: "small",
											type: "danger",
											icon: DeleteFilled,
											onClick: (e) => e.stopPropagation(),
											style: {
												margin: "2px",
											},
										}),
								}
							),
						];
				  },
		} as PatternNode;
	});
});

// f 节点内容渲染
const renderLabel: TreeProps["renderLabel"] = ({ option }) => {
	const node = option as PatternNode | RuleNode;
	return h(
		"div",
		{
			// s 这里如果判断当前节点对应的方案与当前站点匹配则字体显示为红色
			style:
				node.type === "pattern" &&
				!node.id.includes("#") &&
				node.rowData.mainInfo.matchHost.some((host) => {
					return new RegExp(`${host}`).test(location.origin);
				})
					? "color:red;"
					: null,
			title: node.label,
		},
		{ default: () => node.label }
	);
};

//* 拖拽相关
const nowDragNode = ref<TreeOption>();

// f 拖拽开始时
const dragstart: (data: { node: TreeOption; event: DragEvent }) => void = ({
	node,
}) => {
	// console.log(node.id);
	// 记录当前拖拽的节点
	nowDragNode.value = node;
};

// f 判断是否可以放置
const allowDrop: (info: {
	dropPosition: TreeDropInfo["dropPosition"];
	node: TreeOption;
	phase: "drag" | "drop";
}) => boolean = ({ dropPosition, node }) => {
	// console.log("判断是否可以放置", node.id,node.label, dropPosition);
	if ((node.id as string).includes("#")) {
		return dropPosition === "after" && nowDragNode.value!.type === "pattern";
	}

	if (dropPosition === "inside") {
		// 只能允许"规则节点"拖动到"方案节点"内部
		return node.type === "pattern" && nowDragNode.value!.type === "rule";
	} else {
		return true;
	}
};

// f 放置时执行
const handleDrop: (data: TreeDropInfo) => void = ({
	dragNode,
	node,
	dropPosition,
}) => {
	if (
		node.id === dragNode.id ||
		(nowDragNode.value!.id as string).includes("#")
	)
		return;
	console.log("放置", dragNode.id, node.id, dropPosition);
	console.log("放置", dragNode.type, node.type, dropPosition);

	// 将"规则"拖拽到指定"方案"中
	if (
		dropPosition === "inside" &&
		dragNode.type === "rule" &&
		node.type === "pattern"
	) {
		const draggingRuleNode = dragNode as RuleNode;
		const dropPatternNode = node as PatternNode;
		// console.log('将"规则"拖拽到指定"方案"中');
		moveRuleToPattern(draggingRuleNode.id, dropPatternNode.id);
	}

	// 将"方案"拖拽到"规则"上(表示将规则下移到该"规则"所属"方案"之后)
	if (dragNode.type === "pattern" && node.type === "rule") {
		const patternNode = dragNode as PatternNode;
		const ruleNode = node as RuleNode;

		if (patternNode.index < ruleNode.pIndex) {
			// 只有在该方案位于当前规则对应方案之前才执行
			adjustPatternPosition(patternNode.id, ruleNode.pid, "after");
		}
	}

	// 将规则间拖拽(可能跨方案)
	if (dragNode.type === "rule" && node.type === "rule") {
		const draggingRuleNode = dragNode as RuleNode;
		const dropRuleNode = node as RuleNode;
		// console.log("将规则间拖拽(可能跨方案)");
		adjustRulePosition(
			draggingRuleNode.id,
			dropRuleNode.id,
			dropPosition as any
		);
	}

	// 方案间拖拽
	if (
		dropPosition !== "inside" &&
		dragNode.type === "pattern" &&
		node.type === "pattern"
	) {
		// 方案排序
		const draggingPatternNode = dragNode as PatternNode;
		const dropPatternNode = node as PatternNode;
		adjustPatternPosition(
			draggingPatternNode.id,
			dropPatternNode.id,
			dropPosition as any
		);
	}
};

// f 定义节点属性
const nodeProps: TreeProps["nodeProps"] = ({ option }) => {
	return {
		// 点击事件的定义
		onClick() {
			// console.log("点击节点", option);
			// 判断节点类型
			if (option.type === "rule") {
				// 如果点击的是“规则”节点
				const ruleNode = option as RuleNode;
				patternStore.editing.pid = ruleNode.pid;
				patternStore.editing.rid = ruleNode.id;
			} else {
				// 如果点击的是"方案"节点
				const patternNode = option as PatternNode;
				patternStore.editing.pid = patternNode.id;
				patternStore.editing.rid = "";
				// 查询是否含有“规则”节点
				if (patternNode.rowData.rules.length) {
					patternStore.editing.rid = patternNode.rowData.rules[0].id;
				}
			}
		},
	};
};
</script>

<style lang="scss" scoped>
.pattern-tree__container {
	box-sizing: border-box;
	position: relative;
	display: flex;
	flex-flow: column nowrap;
	// padding: 4px;
	gap: 6px;
	height: 100%;

	:deep(.wic2-button + .wic2-button) {
		margin-left: 4px;
	}
}

:deep(.wic2-n-card),
:deep(.wic2-n-input) {
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);
}
.pattern-tree__tree {
	border-radius: 4px;
	overflow: hidden;
}
:deep(.wic2-n-tree) {
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);

	.wic2-n-tree-node-content__text {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
}
</style>
