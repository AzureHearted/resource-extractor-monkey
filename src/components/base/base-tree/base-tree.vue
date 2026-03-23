<template>
	<div class="base-tree__container">
		<div class="base-tree__wrapper">
			<template v-for="item in flattenResult.flat" :key="item.id">
				<BaseTreeNode :level="item.level" :node-data="item"> </BaseTreeNode>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	computed,
	nextTick,
	onMounted,
	provide,
	reactive,
	readonly,
	watch,
} from "vue";
import BaseTreeNode from "./base-tree-node.vue";
import { symbol_BaseTree } from "./symbol";

// 组件选项
defineOptions({
	// 基础Tree组件 (普通嵌套树)
	name: "base-tree",
});

const slots = defineSlots<{
	default(props: { nodeData: BaseTreeNodeItem }): any;
}>();

// 组件 props
const props = withDefaults(
	defineProps<{
		/** 数据列表 */
		data: Array<BaseTreeNodeItem>;
		/** 是否允许拖拽节点 */
		allowDrag?: boolean;
		/** 允许删除节点 */
		allowDeleteNode?: boolean;
		/** 允许增加节点 */
		allowAddNode?: boolean;
		/** 多选模式 */
		multipleSelect?: boolean;
		/** 关键词过滤 */
		keywords?: string;
		/**
		 * 节点请求函数
		 * @param node 目标节点
		 * @returns 子节点列表
		 */
		requestChildren?: (
			node: BaseTreeNodeItem,
		) => Promise<BaseTreeNodeItem[] | null> | BaseTreeNodeItem[] | null;
		/**
		 * 节点添加函数
		 * @param targetNode 目标节点
		 * @param parentNode 父节点
		 * @returns 新增节点数据
		 */
		addNode?: (
			targetNode: BaseTreeNodeItem,
			parentNode: BaseTreeNodeItem | null,
		) => Promise<BaseTreeNodeItem | null> | BaseTreeNodeItem | null;
		/**
		 * 删除节点前
		 * @param node 节点对象
		 * @returns 根据返回值判断是否删除节点数据 (true: 删除节点数据, false: 保留节点数据)
		 */
		beforeDeleteNode?: (node: BaseTreeNodeItem) => boolean | Promise<boolean>;
	}>(),
	{},
);

// ? 自定义事件
const emits = defineEmits<{
	"node-click": [event: MouseEvent, node: BaseTreeNodeItem];
	"node-dblclick": [event: MouseEvent, node: BaseTreeNodeItem];
	"node-contextmenu": [event: PointerEvent, node: BaseTreeNodeItem];
	"select-change": [selectedKeys: Readonly<string[]>];
}>();

// s 选中的节点id列表
const selectedKeys = defineModel<string[]>("selectedKeys", {
	default: () => [] as string[],
});

// s 组件状态
const state = reactive({
	data: [] as Array<BaseTreeNodeItem>,
	expandNodeMap: new Map<string, BaseTreeNodeItem>(),
	// 节点对象的 Map
	nodeMap: new Map<string, BaseTreeNodeItem>(),
	// 节点标签的 DOM Map
	labelDOMMap: new Map<string, HTMLElement>(),
	isFreeze: false,
});

// j 过滤后的节点id列表
const filterKeys = computed<string[]>(() => {
	const keyword = props.keywords?.trim().toLowerCase();

	// 1. 如果没有关键词，直接返回所有 ID
	if (!keyword) {
		// 注意：如果是 reactive Map，应该用 state.nodeMap.keys()
		return allKeys.value;
	}

	// 2. 使用 Set 来存储匹配到的节点及父节点 ID，防止重复
	const matchedSet = new Set<string>();

	// 3. 遍历 nodeMap 的所有值进行搜索
	for (const [_id, node] of state.nodeMap) {
		// 判断当前节点是否符合搜索条件
		if (node.label.toLowerCase().includes(keyword)) {
			// 找到了匹配节点，开始向上溯源
			let currentNode: BaseTreeNodeItem | undefined = node;

			// 只要当前节点存在，且没被处理过，就加入集合并找它的爹
			while (currentNode && !matchedSet.has(currentNode.id)) {
				matchedSet.add(currentNode.id);

				// 通过 pid 从 nodeMap 快速定位父节点
				if (currentNode.pid) {
					currentNode = state.nodeMap.get(currentNode.pid);
				} else {
					break; // 已经到顶了
				}
			}
		}
	}

	return Array.from(matchedSet);
});

// w 监听关键词变化
watch(
	() => props.keywords,
	(newVal, oldVal) => {
		if (newVal === oldVal) return;
		// 如果关键词被清空
		if (!newVal && oldVal) {
			// 则尝试滚动视图到已选中的第一个节点
			if (selectedKeys.value.length) {
				nextTick(() => {
					scrollToNode(selectedKeys.value[0], {
						behavior: "smooth",
						block: "center",
						inline: "center",
					});
				});
			}
		}
	},
);

// j 所有节点的id
const allKeys = computed<string[]>(() => {
	return [...state.nodeMap.keys()];
});

// j 所以展开的节点id
const expandKeys = computed<string[]>(() => {
	return [...state.expandNodeMap.keys()];
});

// j 组件内部的状态数据 (可供子组件访问)
const globalState = computed(() => {
	return readonly({
		selectedKeys,
		allowDrag: props.allowDrag,
		allowDeleteNode: props.allowDeleteNode,
		allowAddNode: props.allowAddNode,
		filterKeys,
		keywords: props.keywords,
	});
});

// w 组件挂载时初始化数据
onMounted(async () => {
	// 先拿到展开的节点
	const oldExpandKeys = expandKeys.value;
	state.data = props.data;
	await nextTick();
	for (const id of oldExpandKeys) {
		const node = getNodeById(id);
		if (node) {
			node.expanded = true;
		}
	}
	if (selectedKeys.value.length) {
		await expandNode(selectedKeys.value[0], true);
		scrollToNode(selectedKeys.value[0]);
	}
});

// w 数据变化时更新数据
watch(
	() => props.data,
	async (newVal, oldVal) => {
		// 先拿到展开的节点
		const oldExpandKeys = expandKeys.value;

		if (newVal !== oldVal) {
			state.data = newVal;
			await nextTick();

			for (const id of oldExpandKeys) {
				const node = getNodeById(id);
				if (node) {
					node.expanded = true;
				}
			}

			if (selectedKeys.value.length) {
				await expandNode(selectedKeys.value[0], true);
				scrollToNode(selectedKeys.value[0]);
			}
		}
	},
);

// t 扁平化结果
interface FlattenResult {
	/** 扁平化后的数据列表 */
	flat: BaseTreeNodeItem[];
	/** 扁平化后的节点Map */
	nodeMap: Map<string, BaseTreeNodeItem>;
}

/**
 * 扁平化数据结构并建立索引
 * @param rootNodes
 */
function flattenAndBuildIndex(
	rootNodes: BaseTreeNodeItem[] | null | undefined,
): FlattenResult {
	const flat: BaseTreeNodeItem[] = [];
	const nodeMap = new Map<string, BaseTreeNodeItem>();

	if (!rootNodes?.length) {
		return { flat, nodeMap };
	}

	const stack: {
		node: BaseTreeNodeItem;
		level: number;
		pid?: string;
	}[] = [];

	// root
	for (let i = rootNodes.length - 1; i >= 0; i--) {
		stack.push({
			node: rootNodes[i],
			level: 0,
			pid: undefined,
		});
	}

	while (stack.length) {
		const { node, level, pid } = stack.pop()!;

		// ===== 索引阶段（对所有节点）=====
		node.level = level;
		node.pid = pid;

		nodeMap.set(node.id, node);

		// ===== 可见节点拍平 =====
		flat.push(node);

		// ===== 仅展开才进入子节点 =====
		if (node.expanded && node.children?.length) {
			for (let i = node.children.length - 1; i >= 0; i--) {
				stack.push({
					node: node.children[i],
					level: level + 1,
					pid: node.id,
				});
			}
		}
	}

	return { flat, nodeMap };
}

// j 扁平化后的结果
const flattenResult = computed(() => {
	return flattenAndBuildIndex(state.data);
});

watch(flattenResult, (res) => {
	state.nodeMap = res.nodeMap;
});

// f 根据id查询节点 (遍历所有数去查找)
function getNodeById(id: string): BaseTreeNodeItem | null {
	return state.nodeMap.get(id) ?? null;
}

// f 展开所有节点
async function expandAllNode() {
	const keys = allKeys.value;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		await expandNode(key, true);
	}
}

// f 折叠所有节点 (包括子节点)
async function foldAllNode() {
	const keys = allKeys.value;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const node = getNodeById(key);
		if (!node) continue;
		foldNode(key);
	}
}

// f 展开指定节点下的所有节点
async function expandTargetInnerNode(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	if (node.isLeaf) return;
	await expandNode(node.id, true);
	const children = node.children;
	if (!children) return;
	for (const item of children) {
		expandTargetInnerNode(item.id);
	}
}

// f 收起指定节点下所有节点
async function foldTargetInnerNode(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	if (node.isLeaf) return;
	foldNode(node.id);
	const children = node.children;
	if (!children) return;
	for (const item of children) {
		foldTargetInnerNode(item.id);
	}
}

// f 展开同阶层节点
async function expandTargetSameLevelNode(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	// 拿到父亲节点
	if (node.pid) {
		const parent = getNodeById(node.pid);
		// 仅展开一层
		for (const item of parent?.children || []) {
			if (item.isLeaf) continue;
			await expandNode(item.id, true);
		}
	} else {
		// 如果不存在pid说明是顶层节点
		for (const item of state.data) {
			if (item.isLeaf) continue;
			await expandNode(item.id, true);
		}
	}
}

// f 收起同阶层节点
async function foldTargetSameLevelNode(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	// 拿到父亲节点
	if (node.pid) {
		const parent = getNodeById(node.pid);
		// 仅展开一层
		for (const item of parent?.children || []) {
			foldNode(item.id);
		}
	} else {
		// 如果不存在pid说明是顶层节点
		for (const item of state.data) {
			foldNode(item.id);
		}
	}
}

// f 当节点挂载时
async function onNodeMounted(
	node: BaseTreeNodeItem,
	labelDOM?: HTMLElement | null,
) {
	// 记录 DOM
	if (labelDOM != null) {
		state.labelDOMMap.set(node.id, labelDOM);
	}
	if (selectedKeys.value.length && selectedKeys.value[0] === node.id) {
		scrollToNode(node.id, {
			behavior: "smooth",
			block: "center",
			inline: "center",
		});
	}
	// 挂载后确保节点状态正确
	if (node.expanded) {
		// console.log('准备展开节点', expandKeys.value, node.id)
		await expandNode(node.id, true);
		// console.log('展开成功', node.id)
	}
}

// f 当节点卸载时
function onNodeUnmounted(id: string) {
	// 卸载时去除记录
	state.labelDOMMap.delete(id);
}

// f 点击节点时候的回调函数
function onNodeClick(e: MouseEvent, id: string) {
	const node = getNodeById(id);
	if (!node) return;
	// ? 节点选中逻辑
	onNodeSelect(e, id);
	emits("node-click", e, node);
}

// f 节点选择函数
function onNodeSelect(e: MouseEvent, id: string) {
	if (props.multipleSelect && e.ctrlKey) {
		// 只有在多选模式下才支持按下ctrl的同时才支持多选
		if (selectedKeys.value.includes(id)) {
			selectedKeys.value.splice(selectedKeys.value.indexOf(id), 1);
		} else {
			selectedKeys.value.push(id);
		}
	} else {
		// 单选模式下只选中当前节点
		selectedKeys.value = [id];
	}
}

// w 监听选中节点变化抛出事件
watch(selectedKeys, (newVal, oldVal) => {
	if (newVal === oldVal) return;
	emits("select-change", readonly(newVal));
});

// f 双击节点时候的回调函数
function onNodeDblClick(e: MouseEvent, id: string) {
	const node = getNodeById(id);
	if (!node) return;
	emits("node-dblclick", e, node);
}

// f 双击节点时候的回调函数
function onNodeContextmenu(e: PointerEvent, id: string) {
	const node = getNodeById(id);
	if (!node) return;
	emits("node-contextmenu", e, node);
}

// f 添加节点
async function onAddNode(id: string) {
	const node = getNodeById(id);
	if (!node) return; // 找不到节点
	await props.addNode?.(node, node.pid ? getNodeById(node.pid) : null);
}

// f 删除指定节点
async function onDeleteNode(id: string) {
	const node = getNodeById(id);
	if (!node) return; // 找不到节点

	// 先请求是否删除
	const isDelete = await props.beforeDeleteNode?.(node);

	if (isDelete === true) {
		// 拿到父节点列表
		const parentChildren = node.pid
			? getNodeById(node.pid)?.children
			: state.data;
		if (!parentChildren) return; // 找不到父节点列表
		// 找到当前元素在节点中的索引
		const index = parentChildren.findIndex((item) => item.id === node.id);
		if (index === -1) return; // 找不到索引
		// 删除节点
		parentChildren.splice(index, 1);
		// 从Map中删除
		state.nodeMap.delete(id);
	}
}

/**
 * 请求子节点的方法
 * @param id 要请求的子节点id
 * @returns 子节点列表
 */
async function requestChildren(id: string): Promise<BaseTreeNodeItem[]> {
	const node = getNodeById(id);
	if (!node || node.isLeaf) return [];

	if (node.loading) return node.children ?? [];

	node.loading = true;
	try {
		const children = await props.requestChildren?.(node); // 纯函数式
		if (children == null) throw "请求结果为空";
		// 添加子节点
		node.children = children;
		return node.children;
	} catch (e) {
		console.log("子节点请求失败", e);
		return [];
	} finally {
		setTimeout(() => {
			node.loading = false;
		}, 300);
	}
}

/**
 * f 节点展开变化时的回调
 * @param id 节点id
 */
async function onToggleExpand(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	// 叶子节点不支持展开
	if (node.isLeaf) return;

	if (!node.expanded) {
		// 如果当前要展开的节点不存在children则尝试请求children
		if (!node.children?.length) {
			await requestChildren(id);
		}
		await expandNode(id);
	} else {
		// 如果取消展开则从展开列表中移除
		foldNode(id);
	}
}

// s 记录最后一次悬浮节点id
let lastDragoverNodeId = "";

/**
 * f 拖拽节点悬浮变化
 * @param id 被拖拽节点id
 * @param targetId 当前被悬浮节点id
 * @param overArea 悬浮区域
 */
function onNodeDragover(
	id: string,
	targetId?: string,
	overArea?: "before" | "inside" | "after",
) {
	if (
		(lastDragoverNodeId && lastDragoverNodeId !== targetId) ||
		(!targetId && lastDragoverNodeId)
	) {
		// 清除上一次节点悬浮样式
		const lastNode = getNodeById(lastDragoverNodeId);
		if (lastNode) {
			delete lastNode.dragoverState;
		}
	}
	if (!targetId || id === targetId) return;

	// 设置当前节点悬浮样式
	const node = getNodeById(targetId);
	if (!node) return;
	node.dragoverState = overArea;
	// 记录dragover节点id
	lastDragoverNodeId = targetId;
}

/**
 * f 放置节点
 * @param id 要放置的节点id
 * @param targetId 目标节点id
 * @param dropArea 放置位置
 */
function onNodeDrop(
	id: string,
	targetId: string,
	dropArea: "before" | "inside" | "after",
) {
	if (lastDragoverNodeId) {
		// 清除上一次节点悬浮样式
		const lastNode = getNodeById(lastDragoverNodeId);
		if (lastNode) {
			delete lastNode.dragoverState;
		}
		// 重置dragover节点id
		lastDragoverNodeId = "";
	}
	if (id === targetId) return;
	moveNode(id, targetId, dropArea);
}

/**
 * f 移动节点到指定位置
 * @param id 要移动的节点id
 * @param toId 目标节点id
 * @param dropArea 放置位置
 */
async function moveNode(
	id: string,
	toId: string,
	dropArea: "before" | "inside" | "after",
) {
	// 同一个节点不进行操作
	if (id === toId) return;
	// 找到要移动的节点
	const node = getNodeById(id);
	// 找到目标节点
	const toNode = getNodeById(toId);
	// 判断目标节点是否是要移动的节点的子节点
	if (isChildNode(toId, id)) return;
	// 判断是否是同级节点
	if (!node || !toNode) return;

	if (dropArea !== "inside") {
		// 放入节点使其成为兄弟节点
		if (node.pid === toNode.pid) {
			// 同级节点进行排序

			const children = !node.pid ? state.data : getNodeById(node.pid)?.children;
			if (!children) throw new Error("节点列表不存在");

			// 1. 找到当前两者的索引
			const index = children.findIndex((item) => item.id === node.id);
			const toIndex = children.findIndex((item) => item.id === toNode.id);

			if (index === -1 || toIndex === -1 || index === toIndex) return;

			// 2. 将元素从数组中彻底移除（这会改变数组长度）
			const [movedItem] = children.splice(index, 1);

			// 3. 在“新数组”中重新定位目标元素的索引
			// 这一步是关键！无论之前是在前还是在后，这一步能拿到最准确的当前位置
			const newToIndex = children.findIndex((item) => item.id === toNode.id);

			// 4. 根据区域决定是插在 target 的前面还是后面
			const finalIndex = dropArea === "before" ? newToIndex : newToIndex + 1;

			// 5. 插入
			children.splice(finalIndex, 0, movedItem);
		} else {
			// 跨父节点的移动
			// 先拿到各自父节点的列表
			const nodeList = node.pid ? getNodeById(node.pid)?.children : state.data;
			const toNodeList = toNode.pid
				? getNodeById(toNode.pid)?.children
				: state.data;
			if (!nodeList || !toNodeList) throw new Error("节点列表不存在");

			// 1. 找到当前节点的索引
			const index = nodeList.findIndex((item) => item.id === node.id);
			if (index === -1) return;

			// 2. 找到目标节点的索引
			const toIndex = toNodeList.findIndex((item) => item.id === toNode.id);
			if (toIndex === -1) return;

			// 3. 将元素从数组中彻底移除（这会改变数组长度）
			const [movedItem] = nodeList.splice(index, 1);

			// 4. 在“新数组”中重新定位目标元素的索引
			// 这一步是关键！无论之前是在前还是在后，这一步能拿到最准确的当前位置
			const newToIndex = dropArea === "before" ? toIndex : toIndex + 1;
			movedItem.pid = toNode.pid; // 重新设置父节点
			// 5. 插入
			toNodeList.splice(newToIndex, 0, movedItem);
		}
	} else {
		// 放入节点使其成为子节点
		if (toNode.isLeaf) return; // 目标节点不能是叶子节点
		if (node.pid === toNode.id) return; // 如果当前节点已经是子节点了就不进行操作
		// 先从原先的父节点中移除
		const nodeList = node.pid ? getNodeById(node.pid)?.children : state.data;
		if (!nodeList) throw new Error("节点列表不存在");
		const index = nodeList.findIndex((item) => item.id === node.id);
		if (index === -1) return;
		nodeList.splice(index, 1);
		toNode.children = toNode.children || (await requestChildren(toId)); // 尝试请求子节点
		node.pid = toId; // 重新设置父节点
		toNode.children.push(node);
		await expandNode(toId);
	}
}

/**
 * f 判断节点是否是pid对应节点的子孙节点
 * @param id 节点id
 * @param pid 父节点id
 * @returns 是否是pid对应节点的子节点
 */
function isChildNode(id: string, potentialParentId: string): boolean {
	let current = state.nodeMap.get(id);
	while (current && current.pid) {
		if (current.pid === potentialParentId) return true;
		current = state.nodeMap.get(current.pid);
	}
	return false;
}

/**
 * f 展开指定节点
 * @param id 节点id
 * @param request 是否请求子节点 @default false
 */
async function expandNode(id: string, request: boolean = false) {
	const node = getNodeById(id);
	if (!node) return;
	// 如果还没展开才进行展开
	if (request && !node.children?.length) {
		await requestChildren(id);
	}
	// 只有节点内容不为空才展开
	if (node.children?.length) {
		// 展开节点
		state.expandNodeMap.set(id, node);
		node.expanded = true;
	}
	// 展开父节点
	if (node.pid) {
		await expandNode(node.pid, request);
	}
}

// f 折叠指定节点
function foldNode(id: string) {
	const node = getNodeById(id);
	if (!node) return;
	state.expandNodeMap.delete(id);
	node.expanded = false;
}

// f 获取节点对应的DOM元素
function getNodeLabelDOM(id: string) {
	const labelDOM =
		state.labelDOMMap.get(id) ||
		document.querySelector(
			`.base-tree__node[data-id="` +
				id.replace(/\\+/g, "\\\\") +
				`"] > .base-tree__node-label`,
		);
	return labelDOM;
}

/**
 * f 滚动到指定节点位置
 * @param id 节点id
 * @param options 滚动参数
 */
function scrollToNode(id: string, options?: ScrollIntoViewOptions) {
	let labelDOM = getNodeLabelDOM(id);

	if (labelDOM == null) return;

	options = {
		behavior: "auto",
		block: "center",
		inline: "center",
		...options,
	};

	requestAnimationFrame(() => {
		labelDOM = getNodeLabelDOM(id);
		if (labelDOM == null) return;
		labelDOM.scrollIntoView(options);
	});
}

// ? 提供给子组件base-tab-pane使用的方法和属性
const provideObj = {
	onNodeMounted,
	onNodeUnmounted,
	onNodeClick,
	onNodeDblClick,
	onNodeContextmenu,
	onNodeDragover,
	onNodeDrop,
	onAddNode,
	onDeleteNode,
	requestChildren,
	onToggleExpand,
	globalState,
	slots,
};
// 导出提供的provide类型
export type provideType = typeof provideObj;
// 调用provide方法
provide(symbol_BaseTree, provideObj);

// ? 暴露属性和方法
defineExpose({
	getNodeById,
	expandAllNode,
	foldAllNode,
	expandNode,
	foldNode,
	expandTargetInnerNode,
	foldTargetInnerNode,
	expandTargetSameLevelNode,
	foldTargetSameLevelNode,
	onToggleExpand,
	scrollToNode,
	expandKeys: readonly(expandKeys),
	allKeys: readonly(allKeys),
	nodeMap: readonly(state.nodeMap),
});
</script>

