<template>
	<div
		class="pattern-tree__container"
		ref="containerRef"
		:data-theme="globalStore.theme"
	>
		<n-card content-style="padding:4px;">
			<n-button-group>
				<n-button type="info" @click="addPattern">
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
		<n-input-group>
			<n-input v-model:value="state.keyword" placeholder="搜索" clearable>
				<template #suffix>
					<n-switch v-model:value="state.hightlightFilterOnly">
						<template #checked> 全部 </template>
						<template #unchecked> 过滤 </template>
					</n-switch>
				</template>
			</n-input>
		</n-input-group>
		<BaseScrollbar
			ref="scrollbarRef"
			class="pattern-tree__tree"
			:track-size="8"
		>
			<BaseVirtualTree
				ref="treeRef"
				:data="treeData"
				:item-height="32"
				v-model:selected-keys="state.selectedKeys"
				:scroll-container="scrollbarRef?.viewportDOM"
				:hightlight-filter-only="state.hightlightFilterOnly"
				allow-drag
				:keywords="state.keyword"
				:add-node="onAddNode"
				:before-delete-node="onBeforeDeleteNode"
				:before-move-node="onBeforeMoveNode"
				@node-contextmenu="onNodeContextMenu"
				@node-click="onNodeClick"
			>
				<template #default="{ nodeData }">
					<div style="display: flex; align-items: center; gap: 4px">
						<div style="width: 16px; overflow: hidden">
							<BaseImg
								v-if="(nodeData as Node).type === 'pattern'"
								:src="(nodeData as Node).icon"
								style="width: 100%; height: 100%"
							>
								<template #error-img>
									<icon-oui-app-index-pattern />
								</template>
							</BaseImg>
							<icon-material-symbols-data-object-rounded
								style="font-size: 16px"
								v-else
							/>
						</div>
						<BaseHighlightText
							:text="nodeData.label"
							:keyword="state.keyword"
							:style="{
								color:
									!(nodeData as Node).id.includes('#') &&
									(nodeData as Node).type === 'pattern' &&
									(nodeData as Node).rawData != null &&
									(
										(nodeData as Node).rawData as Pattern
									).mainInfo.matchHost.some((host) => {
										return new RegExp(`${host}`).test(locationOrigin);
									})
										? 'red'
										: null,
							}"
						/>
					</div>
				</template>
			</BaseVirtualTree>
		</BaseScrollbar>
	</div>
</template>

<script setup lang="ts">
import {
	computed,
	useTemplateRef,
	nextTick,
	watch,
	onMounted,
	reactive,
} from "vue";
import { useDialog, useNotification } from "naive-ui";
import { Pattern } from "@/models/Pattern/Pattern";
import {
	BaseImg,
	BaseHighlightText,
	BaseScrollbar,
	BaseVirtualTree,
	useContextMenu,
	type BaseTreeNodeItem,
} from "base-ui";

import { useGlobalStore, usePatternStore } from "@/stores";
import { storeToRefs } from "pinia";
import type { Rule } from "@/models/Rule/Rule";

const globalStore = useGlobalStore();
const patternStore = usePatternStore();
const { list: patterns } = storeToRefs(patternStore);

const dialog = useDialog();
const notification = useNotification();

const containerRef = useTemplateRef("containerRef");
const scrollbarRef = useTemplateRef("scrollbarRef");

const treeRef = useTemplateRef("treeRef");

const locationOrigin = location.origin;

const state = reactive({
	keyword: "", //关键词
	hightlightFilterOnly: false, // 是否过滤无关节点
	selectedKeys: new Array<string>(), //选中的节点
});

onMounted(() => {
	const matchs = patternStore.getMatchPatterns();
	if (matchs.length === 0) return;
	const [first] = matchs;
	state.selectedKeys = [first.id];
});

watch(
	() => patternStore.editing.rid,
	(newRid, oldRid) => {
		if (newRid !== oldRid) state.selectedKeys = [newRid];
	},
);

watch(
	() => state.selectedKeys,
	(keys) => {
		const [key = "#"] = keys;
		// 先尝试匹配方案id，如果匹配不到，则遍历每个方案匹配规则id
		const pattern = patterns.value.find((p) => p.id === key);
		if (pattern) {
			// ? 选中了方案节点
			// 自动选中方案下的第一个规则节点
			const rule = pattern.rules[0];
			state.selectedKeys = [rule.id];
			expandNode(pattern.id);
			patternStore.editing.pid = pattern.id;
			patternStore.editing.rid = rule.id;
		} else {
			// ? 选中了规则节点
			// 遍历所有方案，找到规则所在的方案
			const pattern = patterns.value.find((p) =>
				p.rules.some((r) => r.id === key),
			);
			if (pattern) {
				patternStore.editing.pid = pattern.id;
				const rule = pattern.rules.find((r) => r.id === key);
				patternStore.editing.rid = rule?.id ?? "#";
			} else {
				// 如果没有找到则清空选中项
				const pattern = patterns.value.find((p) => p.id === "#");
				patternStore.editing.pid = pattern?.id ?? "#";
				const [rule] = pattern?.rules || [];
				patternStore.editing.rid = rule?.id ?? "#";
				state.selectedKeys = [rule?.id ?? "#"];
			}
		}
	},
);

// i 节点数据定义
interface Node extends BaseTreeNodeItem {
	type: "pattern" | "rule";
	icon?: string;
	rawData?: Pattern | Rule;
}

// s 节点树数据
const treeData = computed(() => {
	// 每次更新前先获取所有展开的Keys，然后当
	return patterns.value.map<Node>((pattern) => {
		return {
			id: pattern.id,
			type: "pattern",
			icon: pattern.backup?.mainInfo.icon || pattern.mainInfo.icon,
			label:
				(pattern.backup?.mainInfo.name || pattern.mainInfo.name) +
				(pattern.isChange() ? "*" : ""),
			showAddButton: !pattern.id.includes("#"),
			showDeleteButton: !pattern.id.includes("#"),
			children: pattern.rules.map<Node>((rule) => {
				return {
					id: rule.id,
					type: "rule",
					label:
						(rule.backup?.name || rule.name) + (rule.isChange() ? "*" : ""),
					isLeaf: true,
					pid: pattern.id,
					showDeleteButton: !rule.id.includes("#") && pattern.rules.length > 1,
					rawData: rule,
				};
			}),
			rawData: pattern,
		};
	});
});

// j 方案列表及其内容是否发生变化
// const isChange = computed(() => {
// 	return patterns.value.some((p) => p.isChange());
// });

/**
 * 添加规则
 * @param node 方案节点
 */
async function addRule(node: Node) {
	// 如果有pid说明是点击了规则上的添加按钮
	if (node.pid) return null;
	// ? 新增规则
	// 先找到对应方案
	const pattern = patterns.value.find((p) => p.id === node.id);
	if (pattern == null) return null;
	// 获取当前方案下所有规则名称列表
	const ruleNames = pattern.rules.map((r) => r.name);
	let name = "新规则";
	let index = 1;
	// 循环到没有名称重复
	while (ruleNames.includes(name)) {
		name = `新规则${index}`;
		index++;
	}
	// 创建规则
	const rid = pattern.createRule({ name });
	if (!rid) return null;
	// console.log("新增规则", rid);
	await nextTick();
	// 展开方案节点
	expandNode(pattern.id);
	// 滚动到新增的这个规则节点
	scrollToNode(rid);
	// 然后选中这个规则节点
	state.selectedKeys = [rid];

	return null;
}

// f 新增节点的回调
const onAddNode: InstanceType<typeof BaseVirtualTree>["addNode"] = (node) => {
	return addRule(node as Node);
};

// f 删除节点前的回调
const onBeforeDeleteNode: InstanceType<
	typeof BaseVirtualTree
>["beforeDeleteNode"] = (node) => {
	return deleteNode(node as Node);
};

// f 删除节点
function deleteNode(node: Node) {
	return new Promise<boolean>((resolve) => {
		if (!node.pid) {
			// ? 删除方案
			const index = patterns.value.findIndex((p) => p.id === node.id);
			if (index < 0) {
				resolve(false);
				return false;
			}
			dialog.warning({
				title: "确认删除方案？",
				content: `确认删除方案 "${node.label}" 及其所有规则吗？此操作不可撤销！`,
				positiveText: "删除",
				negativeText: "取消",
				onPositiveClick() {
					console.log("删除方案", index);
					// 从列表中删除方案
					patterns.value.splice(index, 1);

					// ! 数据库同步删除方案
					saveAll();
					// 删除后选中其上的一个方案
					if (patterns.value.length > 1 && index - 1 >= 0) {
						const prePattern = patterns.value[index - 1];
						expandNode(prePattern.id);
						const [rule] = prePattern.rules;
						if (rule != null) state.selectedKeys = [rule.id];
					}
					resolve(true);
				},
				onNegativeClick() {
					console.log("取消");
					resolve(false);
				},
				onMaskClick() {
					console.log("取消");
					resolve(false);
				},
				onClose() {
					console.log("取消");
					resolve(false);
				},
				onEsc() {
					console.log("关闭");
					resolve(false);
				},
			});
		} else {
			// ? 删除规则
			// 先找到对应方案
			const pattern = patterns.value.find((p) => p.id === node.pid);
			if (!pattern) {
				resolve(false);
				return false;
			}
			dialog.warning({
				title: "确认删除规则？",
				positiveText: "删除",
				negativeText: "取消",
				onPositiveClick() {
					const index = pattern.rules.findIndex((r) => r.id === node.id);
					pattern.deleteRule(node.id);
					console.log("删除规则", pattern.mainInfo.name, node.id);
					// ! 数据库同步更新方案
					// saveAll();
					// 然后默认选中当前方案的上一个
					if (pattern.rules.length > 0 && index - 1 > 0)
						state.selectedKeys = [pattern.rules[index - 1].id];

					resolve(true);
				},
				onNegativeClick() {
					console.log("取消");
					resolve(false);
				},
				onMaskClick() {
					console.log("取消");
					resolve(false);
				},
				onClose() {
					console.log("取消");
					resolve(false);
				},
				onEsc() {
					console.log("关闭");
					resolve(false);
				},
			});
		}
	});
}

// f 节点移动前的回调
const onBeforeMoveNode: InstanceType<
	typeof BaseVirtualTree
>["beforeMoveNode"] = async (id, toId, direction) => {
	// 找到要操作的节点和目标节点
	const node = treeRef.value?.getNodeById(id) as Node;
	const targetNode = treeRef.value?.getNodeById(toId) as Node;

	// 判断节点类型
	if (node.type === "rule" && targetNode.type === "rule") {
		// 找到方案索引
		const patternIndex = patterns.value.findIndex((p) => p.id === node.pid);
		const targetPatternIndex = patterns.value.findIndex(
			(p) => p.id === targetNode.pid,
		);

		// ? 这里当方案索引为0时取消操作是因为，第一个方案是默认方案不可更改
		if (patternIndex <= 0 || targetPatternIndex <= 0) return false;
		const pattern = patterns.value[patternIndex];
		const targetPattern = patterns.value[targetPatternIndex];

		// 找到要操作的规则索引
		let ruleIndex = pattern.rules.findIndex((r) => r.id === node.id);
		// 找到目标规则索引
		let targetRuleIndex = targetPattern.rules.findIndex(
			(r) => r.id === targetNode.id,
		);

		if (pattern.id === targetPattern.id) {
			// ? 规则同级移动 （排序）

			if (targetRuleIndex < 0 || ruleIndex < 0) return false;

			// 将元素从数组中彻底移除（这会改变数组长度）
			const [rule] = pattern.rules.splice(ruleIndex, 1);

			// 这一步是关键！无论之前是在前还是在后，这一步能拿到最准确的当前位置
			targetRuleIndex = pattern.rules.findIndex(
				(item) => item.id === targetNode.id,
			);

			// 根据区域决定是插在 目标 的前面还是后面
			const insertIndex =
				direction === "before" ? targetRuleIndex : targetRuleIndex + 1;
			// 插入
			pattern.rules.splice(insertIndex, 0, rule);
		} else {
			// ? 规则跨方案移动
			// 先从目标方案中裁剪出规则
			const [rule] = pattern.rules.splice(ruleIndex, 1);

			// 根据区域决定是插在 目标 的前面还是后面
			const insertIndex =
				direction === "before" ? targetRuleIndex : targetRuleIndex + 1;

			targetPattern.rules.splice(insertIndex, 0, rule);
		}
	}

	if (
		node.type === "rule" &&
		targetNode.type === "pattern" &&
		direction === "inside"
	) {
		// ? 将规则移动到目标方案尾部
		const patternIndex = patterns.value.findIndex((p) => p.id === node.pid);

		// 先找到对应方案
		const targetPatternIndex = patterns.value.findIndex(
			(p) => p.id === targetNode.id,
		);

		// ? 这里当目标方案索引为0时取消操作是因为，第一个方案是默认方案不可更改
		if (patternIndex < 0 || targetPatternIndex <= 0) return false;

		const pattern = patterns.value[patternIndex];
		const targetPattern = patterns.value[targetPatternIndex];

		// 找到要操作的规则索引
		const ruleIndex = pattern.rules.findIndex((r) => r.id === node.id);
		// 先从目标方案中裁剪出规则
		const [rule] = pattern.rules.splice(ruleIndex, 1);
		// 再添加到目标方案尾部
		targetPattern.rules.push(rule);

		// 然后展开目标方案节点
		expandNode(targetPattern.id);
	}

	if (
		node.type === "pattern" &&
		targetNode.type === "pattern" &&
		direction !== "inside"
	) {
		// ? 方案排序
		// 两个方案的索引
		const index = patterns.value.findIndex((p) => p.id === node.id);
		let targetIndex = patterns.value.findIndex((p) => p.id === targetNode.id);

		// ? 这里index = 0也取消操作是因为，第一个方案是默认方案不可移动
		if (index <= 0 || targetIndex < 0) return false;
		// 先从列表中移除要操作的方案
		const [pattern] = patterns.value.splice(index, 1);
		// 重新获取目标索引
		targetIndex = patterns.value.findIndex((p) => p.id === targetNode.id);
		// 根据区域决定是插在 目标 的前面还是后面
		const insertIndex = direction === "before" ? targetIndex : targetIndex + 1;
		// 不可插在第一个位置
		if (insertIndex === 0) {
			// 被裁剪的方案放回原位
			patterns.value.splice(index, 0, pattern);
			return false;
		}
		// 插入
		patterns.value.splice(insertIndex, 0, pattern);

		// ! 数据库同步更新方案
		saveAll();
	}

	return false;
};

// 使用自定义右键菜单
const { showContextMenu } = useContextMenu({
	root: () => containerRef.value,
	fontSize: 14,
});

// f 右键菜单回调
const onNodeContextMenu: InstanceType<
	typeof BaseVirtualTree
>["$props"]["onNode-contextmenu"] = async (e, rawNode) => {
	e.preventDefault();

	const node = rawNode as Node;

	const result = await showContextMenu(e, [
		{
			label: `添加规则`,
			command: "add-new-rule",
			hidden: node.type !== "pattern",
		},
		{
			label: `删除${node.type === "pattern" ? "方案" : "规则"} "${node.label}"`,
			command: "remove",
			disable:
				node.type === "rule" &&
				node?.pid != null &&
				(() => {
					const p = patternStore.findPattern(node.pid);
					if (p == null) return true;
					return p.rules.length <= 1;
				})(),
		},
	] as const);

	switch (result) {
		case "add-new-rule":
			addRule(node);
			break;
		case "remove":
			deleteNode(node);
			break;
	}
};

// f 左键单击节点时的回调
const onNodeClick: InstanceType<
	typeof BaseVirtualTree
>["$props"]["onNode-click"] = async (_e, node) => {
	if ((node as Node).type === "pattern") {
		await nextTick();
		const pattern = patterns.value.find((p) => p.id === node.id);
		if (pattern && !node.expanded) {
			scrollToNode(pattern.rules[0].id);
		}
	}
};

// f 展开节点
async function expandNode(nodeId: string) {
	await nextTick();
	await treeRef.value?.expandNode(nodeId);
}

// f 滚动到节点
async function scrollToNode(nodeId: string) {
	await nextTick();
	await treeRef.value?.scrollToNode(nodeId);
}

// f 添加新方案
async function addPattern() {
	const pattern = new Pattern();
	// 给方案分配名称
	// 先获取方案池中已有的名称
	const names = patterns.value.map((p) => p.mainInfo.name);
	// 判断 `新方案` 是否已经存在
	let name = "新方案";
	let index = 1;
	// 循环到 `新方案 {index}` 不存在为止
	while (names.includes(name)) {
		name = `新方案${index++}`;
	}
	// 给方案设置名称
	pattern.mainInfo.name = name;
	// 及时备份数据
	pattern.backupData();

	patterns.value.push(pattern);

	// ! 同步更新数据库
	saveAll();

	await nextTick();

	// 展开方案节点
	expandNode(pattern.id);
	// 然后滚动到该方案的第一个规则节点
	scrollToNode(pattern.rules[0].id);
	// 然后选中这个新方案
	state.selectedKeys = [pattern.id];
}

// f 粘贴方案
function pastePattern() {
	navigator.clipboard
		.readText()
		.then((dataStr) => {
			console.log("剪贴板文本：", dataStr);
			// 先尝试解析成一个对象
			let obj: any;
			try {
				obj = JSON.parse(dataStr);
			} catch (e) {
				notification.error({
					title: "失败",
					content: "剪贴板内容解析失败",
					duration: 3000,
				});
				return;
			}
			// 如果成功解析成对象,则进一步尝试解析为方案
			let pattern: Pattern | false = false;
			try {
				pattern = new Pattern(obj);
				// 如果成功解析为方案则添加为方案
				patternStore.list.push(pattern);
				patternStore.saveUserPatternInfo();
				notification.success({
					title: "成功",
					content: "成功解析为方案",
					duration: 3000,
				});
			} catch (e) {
				// 如果解析失败则提示错误
				notification.error({
					title: "失败",
					content: "剪贴板内容不符合方案的数据格式",
					duration: 3000,
				});
			}
		})
		.catch(() => {
			notification.error({
				title: "失败",
				content: "剪贴板内容读取失败",
				duration: 3000,
			});
		});
}

// f 保存所有方案
function saveAll() {
	patterns.value.forEach((pattern) => {
		// 先调用方案备份方法
		pattern.backupData();
	});
	patternStore.saveUserPatternInfo();
}
</script>

<style lang="scss" scoped>
.pattern-tree__container {
	box-sizing: border-box;
	position: relative;
	display: flex;
	flex-flow: column nowrap;
	gap: 4px;
	height: 100%;

	:deep(.base-tree__node-label__content-left) {
		font-size: 14px;
		color: getTheme(light, color);
	}

	:deep(.re-n-card),
	:deep(.re-n-input) {
		background: rgba(getTheme(light, background), 0.3);
		backdrop-filter: getStyle(backdrop-filter);
	}

	.pattern-tree__tree {
		border-radius: 4px;
		overflow: hidden;
		background-color: rgba(getTheme(light, background), 0.5);
		backdrop-filter: getStyle(backdrop-filter);
	}
}

.pattern-tree__container[data-theme="dark"] {
	.pattern-tree__tree {
		background-color: rgba(getTheme(dark, background), 0.5);
	}

	:deep(.base-tree__node-label__content-left) {
		color: getTheme(dark, color);
	}

	:deep(.re-n-card),
	:deep(.re-n-input) {
		background: rgba(getTheme(dark, background), 0.3);
	}

	:deep(.re-n-tree) {
		background: rgba(getTheme(dark, background), 0.3);
	}
}
</style>
