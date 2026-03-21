<template>
	<n-flex class="toolbar-wrap" :size="4">
		<!-- s 方案选择器 -->
		<n-select
			class="pattern-selector"
			v-model:value="patternStore.used.id"
			placeholder="请选择一个方案"
			:to="false"
			:render-label="renderPatternSelectOptionsLabel"
			:options="patternSelectOptions"
			filterable
		/>
		<!-- s 操作栏 -->
		<n-badge
			:offset="[-8, 2]"
			type="info"
			:max="999"
			:show="!!data.cardList.length"
			:value="data.cardList.length"
			style="align-items: center"
		>
			<var-menu
				placement="bottom-start"
				:same-width="false"
				:trigger="isMobile ? 'click' : 'hover'"
				:teleport="false"
			>
				<var-button-group type="primary">
					<!-- s 加载按钮 -->
					<var-button @click.stop="getCards" v-if="!loadingStore.loading" block>
						加载
					</var-button>
					<var-button @click.stop="stopGetCards" v-else block>
						停止
					</var-button>
					<var-button style="padding: 0 4px">
						<icon-material-symbols-arrow-drop-down-rounded
							style="fill: white"
							width="24"
							height="24"
						/>
					</var-button>
				</var-button-group>
				<template #menu>
					<var-cell
						@click="reload"
						title="重新加载"
						v-if="!loadingStore.loading"
						ripple
					>
						<template #icon>
							<icon-ant-design-reload-outlined />
						</template>
					</var-cell>
					<var-cell @click="resetFilters" title="重置过滤器" ripple>
						<template #icon>
							<Icon
								icon="material-symbols:reset-settings-rounded"
								width="1.2em"
								height="1.2em"
							/>
						</template>
					</var-cell>
					<var-cell
						@click="clear"
						title="清空所有"
						v-if="!!data.cardList.length && !loadingStore.loading"
						ripple
					>
						<template #icon>
							<icon-mdi-delete-empty style="color: red" />
						</template>
					</var-cell>
				</template>
			</var-menu>
		</n-badge>
		<!-- s 排序方式 -->
		<n-select
			class="sort-method-selector"
			v-model:value="sort.method"
			placeholder="请选择一个排序方式"
			:to="false"
			:options="sort.groups"
		/>
		<!-- s 选择器 -->
		<n-badge
			:offset="[-116, 2]"
			type="success"
			:max="999"
			:show="!!currentCardList.length"
			:value="currentCardList.length"
			style="align-items: center"
		>
			<!-- 选择器按钮组 -->
			<var-button-group class="control-button-group">
				<var-button type="primary" @click="checkAll"> 全选 </var-button>
				<var-button type="info" @click="inverseAll"> 反选 </var-button>
				<var-button @click="cancel"> 取消 </var-button>
			</var-button-group>
		</n-badge>
		<!-- s 下载控制 -->
		<n-badge
			:offset="[0, 2]"
			:max="999"
			:show="!!checkedCardList.length"
			:value="`${checkedCardList.length}${checkedTotalSizeTip}`"
			style="align-items: center"
		>
			<var-menu
				placement="bottom-start"
				:trigger="isMobile ? 'click' : 'hover'"
				:teleport="false"
			>
				<var-button-group type="primary">
					<var-button
						:disabled="!checkedCardList.length"
						@click.stop="downloadSelected"
					>
						下载
					</var-button>
					<var-button
						v-if="!!currentCardList.length"
						:disabled="!currentCardList.length || loadingStore.loading"
						style="padding: 0 4px"
					>
						<icon-material-symbols-arrow-drop-down-rounded
							style="fill: white"
							width="24"
							height="24"
						/>
					</var-button>
				</var-button-group>
				<template #menu>
					<var-cell
						title="全部下载"
						v-if="!!currentCardList.length"
						@click="downloadAll"
						ripple
					>
						<template #icon>
							<icon-mdi-auto-download />
						</template>
					</var-cell>
					<var-cell
						title="删除选中项"
						@click="deleteSelected"
						v-if="!!checkedCardList.length"
						ripple
					>
						<template #icon>
							<icon-mdi-delete-sweep style="color: red" />
						</template>
					</var-cell>
					<var-cell
						title="收藏选中项"
						@click="favoriteSelected"
						v-if="!!checkedCardList.length"
						ripple
					>
						<template #icon>
							<icon-mdi-book-favorite style="color: purple" />
						</template>
					</var-cell>
					<var-cell
						title="批量添加标签"
						@click="showTagEdit = true"
						v-if="!!checkedCardList.length"
						ripple
					>
						<template #icon>
							<icon-mdi-tag-text style="color: purple" />
						</template>
					</var-cell>
				</template>
			</var-menu>
		</n-badge>
		<!-- s 过滤控制器 -->
		<n-flex :size="4">
			<!-- s 扩展名过滤器 -->
			<n-select
				class="ext-selector"
				v-if="nowType !== 'html'"
				v-model:value="storeFilters.extension"
				placeholder="扩展名过滤"
				multiple
				clearable
				:to="false"
				:render-tag="renderTag"
				:render-label="renderOptionLabelWithCount"
				:options="extOptions"
				max-tag-count="responsive"
			/>
			<!-- s 关键词过滤 -->
			<n-badge
				class="keyword-filter-input"
				:offset="[-4, 2]"
				:value="filterCardList.all.length"
				:max="999"
				type="info"
				style="align-items: center"
			>
				<n-input
					type="text"
					v-model:value="filters.keyword"
					placeholder="输入检索关键词"
					clearable
					@update:value="handleKeywordFilter()"
					@clear="handleKeywordFilter('')"
					@keydown.enter="handleKeywordFilter()"
				/>
			</n-badge>
		</n-flex>
		<!-- s 尺寸过滤器 -->
		<n-flex
			v-if="nowType === 'image' || nowType === 'video'"
			class="size-filter"
			:size="4"
		>
			<!-- 宽度过滤器 -->
			<n-flex class="width-filter" :size="0" :wrap="false">
				<n-gradient-text
					type="info"
					style="margin-top: 6px; margin-left: 8px; margin-right: 12px"
				>
					宽度
				</n-gradient-text>
				<n-slider
					:size="isMobile ? 'small' : 'default'"
					v-model:value="filters.size.width"
					range
					:marks="filters.marks.width"
					:min="sizeRange.width[0]"
					:max="sizeRange.width[1]"
					:step="1"
					@update-value="(e) => debounceFilterChange('width', e)"
				/>
			</n-flex>
			<!-- 高度过滤器 -->
			<n-flex class="height-filter" :size="0" :wrap="false">
				<n-gradient-text
					type="info"
					style="margin-top: 6px; margin-left: 8px; margin-right: 12px"
				>
					高度
				</n-gradient-text>
				<n-slider
					:size="isMobile ? 'small' : 'default'"
					v-model:value="filters.size.height"
					range
					:marks="filters.marks.height"
					:min="sizeRange.height[0]"
					:max="sizeRange.height[1]"
					:step="1"
					@update-value="(e) => debounceFilterChange('height', e)"
				/>
			</n-flex>
		</n-flex>
		<!-- j 进度条 -->
		<el-progress
			class="toolbar-loading"
			striped
			striped-flow
			:class="{ 'loading-active': loadingStore.loading }"
			:status="loadingStore.percentage === 100 ? 'success' : ''"
			:stroke-width="16"
			:text-inside="true"
			:percentage="Number(loadingStore.percentage.toFixed(2))"
		>
		</el-progress>
		<!-- s Tag编辑器  -->
		<TagEdit
			:title="`批量添加标签(${checkedCardList.length}个卡片)`"
			v-model:show="showTagEdit"
			@on-save="batchAddTag"
		>
		</TagEdit>
	</n-flex>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted, computed, watch, onActivated } from "vue";
import type { VNodeChild } from "vue";
import { NTag, NBadge } from "naive-ui";
import type { SelectOption, SelectRenderTag, SliderProps } from "naive-ui";
import { Pattern } from "@/models/Pattern/Pattern";
import BaseImg from "@/components/base/base-img.vue";
import TagEdit from "./tag-edit.vue";
import { Icon } from "@iconify/vue";

// 导入公用ts库
import { byteAutoUnit, isMobile as judgeIsMobile } from "@/utils/common";

// 导入仓库
import {
	useGlobalStore,
	useCardStore,
	useFavoriteStore,
	useLoadingStore,
	usePatternStore,
} from "@/stores";
import { storeToRefs } from "pinia";
import type { Card } from "@/models/Card/Card";
import { useDebounceFn } from "@vueuse/core";

const globalStore = useGlobalStore();

onMounted(() => {
	if (globalStore.galleryState.pageLoadedGetResource) {
		reload();
	}
});

const cardStore = useCardStore();
const {
	data,
	sort,
	sizeRange,
	filterCardList,
	selectionCardList,
	extensionOptions: extOptions,
	filters: storeFilters,
	nowType,
} = storeToRefs(cardStore);
const { initSizeRange } = cardStore;
const favoriteStore = useFavoriteStore();
const loadingStore = useLoadingStore();
const patternStore = usePatternStore();

// s 移动端标识符
const isMobile = ref(false);
onActivated(() => {
	isMobile.value = judgeIsMobile();
});

// s 过滤器定义
const filters = reactive({
	keyword: "",
	size: {
		width: [200, 1024],
		height: [200, 1024],
	},
	marks: computed(() => {
		const widthMarks: SliderProps["marks"] = {};
		const widthMax = sizeRange.value.width[1];

		[360, 720, 1080, 1920, 2560, 3840].forEach((v) => {
			if (widthMax >= v) {
				widthMarks[v] = String(v);
			}
		});

		const heightMarks: SliderProps["marks"] = {};
		const heightMax = sizeRange.value.height[1];

		[360, 720, 1080, 1920, 2560, 3840].forEach((v) => {
			if (heightMax >= v) {
				heightMarks[v] = String(v);
			}
		});

		return {
			width: widthMarks,
			height: heightMarks,
		};
	}),
});

// 监听card仓库卡片尺寸最大值变化
watch(
	() => [sizeRange.value.width[1], sizeRange.value.height[1]],
	([width, height]) => {
		filters.size.width[1] = width;
		filters.size.height[1] = height;
	},
);

const currentCardList = computed<Card[]>(() => {
	return filterCardList.value[nowType.value] ?? [];
});

// 被勾选的卡片
const checkedCardList = computed<Card[]>(() => {
	return selectionCardList.value[nowType.value] ?? [];
});

// 计算被选中的卡片对应的体积大小总和
const checkedTotalSizeTip = computed(() => {
	let existUnDownload = false; // 标记是否存在为下载的卡片
	// 先计算尺寸大小
	const totalByte = checkedCardList.value.reduce((total, curr) => {
		if (curr.source.blob) {
			return total + curr.source.blob.size;
		} else {
			existUnDownload = true;
			return total;
		}
	}, 0);
	// 合成显示文本
	if (totalByte) {
		return ` (${byteAutoUnit(totalByte)})${
			existUnDownload ? " 存在未下载" : ""
		}`;
	} else {
		return "";
	}
});

// 控制相关
// 方案选项
const patternSelectOptions = computed<SelectOption[]>(() => {
	return patternStore.list.map((p) => {
		return {
			key: p.id,
			label: p.mainInfo.name,
			value: p.id,
			rowData: p,
		} as SelectOption;
	});
});

// 方案选项标签渲染函数
const renderPatternSelectOptionsLabel = (option: SelectOption): VNodeChild => {
	return h(
		"div",
		{
			style: "display:flex; align-items: center;",
		},
		[
			option && !(option.key as string).includes("#")
				? h(BaseImg, {
						src: (option.rowData as Pattern).mainInfo.icon,
						style:
							"width: 16px; height: 16px;margin-right:4px; flex-shrink: 0;",
					})
				: null,
			h(
				"div",
				{
					style: {
						userSelect: "none",
						// s 这里如果判断选项对应的方案与当前站点匹配则字体显示为红色
						color:
							!(option.rowData as Pattern).id.includes("#") &&
							(option.rowData as Pattern).mainInfo.matchHost.some((host) => {
								return new RegExp(`${host}`).test(location.origin);
							})
								? "red"
								: null,
						overflow: "hidden",
						"text-overflow": "ellipsis",
					},
					title: option.label,
				},
				{ default: () => option.label as string },
			),
		],
	);
};

// 选择器多选Tag渲染函数
const renderTag: SelectRenderTag = ({ option, handleClose }) => {
	return h(
		NTag,
		{
			type: "info",
			closable: true,
			onMousedown: (e: FocusEvent) => {
				e.preventDefault();
			},
			onClose: (e: MouseEvent) => {
				e.stopPropagation();
				handleClose();
			},
		},
		{ default: () => option.label },
	);
};

// 带数量的选项标签渲染函数
const renderOptionLabelWithCount = (option: SelectOption): VNodeChild => {
	return h(
		"div",
		{
			style: "display:flex; align-items: center;width:100%;",
		},
		[
			h(
				"div",
				{ title: option.label },
				{ default: () => option.label as string },
			),
			h(
				NBadge,
				{
					type: "info",
					max: 999,
					style: "margin-left:auto;",
				},
				{
					value: () =>
						(option.count as number) <= 999 ? option.count : "999+" + "个",
				},
			),
		],
	);
};

// 停止标识符
let stopGetCardsFlag = ref(false);

// f 获取卡片
async function getCards() {
	stopGetCardsFlag.value = false;
	await cardStore.getPageCard({
		stopFlag: stopGetCardsFlag,
	});
}

// f 终止卡片获取进度
function stopGetCards() {
	// console.log("终止操作")
	stopGetCardsFlag.value = true;
}

// f 重新加载
async function reload() {
	await clear(); // 先清空
	await getCards(); // 后重载
}

// f 清空
async function clear() {
	await cardStore.clearCardList();
	filters.size.width = storeFilters.value.size.width;
	filters.size.height = storeFilters.value.size.height;
}

const debounceFilterChange = useDebounceFn(filterChange, 300);

// f 过滤器改变
function filterChange(
	key: "width" | "height",
	value: number | [number, number],
) {
	// console.log("过滤器变化", key, value);
	if (typeof value === "number") {
		storeFilters.value.size[key][0] = value; // 更新仓库过滤器
	}

	if (typeof value === "object" && value instanceof Array) {
		storeFilters.value.size[key] = value; // 更新仓库过滤器
	}
}

// f 处理关键词过滤
const handleKeywordFilter = (value?: string) => {
	const keyword = value !== undefined ? value : filters.keyword;
	// console.log("触发关键词过滤", keyword);
	storeFilters.value.keyword = keyword;
	// updateMatchStatus();
};

// f 全选
function checkAll() {
	filterCardList.value[nowType.value].forEach((c) => (c.isSelected = true));
}

// f 反选
function inverseAll() {
	filterCardList.value[nowType.value].forEach(
		(c) => (c.isSelected = !c.isSelected),
	);
}

// f 取消
function cancel() {
	filterCardList.value[nowType.value].forEach((c) => (c.isSelected = false));
}

// f 重置过滤器
function resetFilters() {
	cardStore.resetFilters();
	filters.size.width = initSizeRange.width;
	filters.size.height = initSizeRange.height;
}

// f 下载选中项
function downloadSelected() {
	const cards =
		filterCardList.value[nowType.value].filter((x) => x.isSelected) || [];
	cardStore.downloadCards(cards);
}

// f 下载全部
function downloadAll() {
	const cards = filterCardList.value[nowType.value] || [];
	cardStore.downloadCards(cards);
}

// f 删除选中项
function deleteSelected() {
	const ids = filterCardList.value[nowType.value]
		.filter((x) => x.isSelected)
		.map((x) => x.id);
	cardStore.removeCard(ids);
}

// f 收藏选中项
function favoriteSelected() {
	favoriteStore.favorite(selectionCardList.value[nowType.value]); // 添加卡片到Favorite仓库
	selectionCardList.value[nowType.value].forEach(
		(card) => (card.isFavorite = true),
	); // 更新卡片收藏状态
}

const showTagEdit = ref(false);
// f 批量添加标签
const batchAddTag = (tags: string[]) => {
	selectionCardList.value[nowType.value].forEach((c) => {
		c.tags = [...new Set([...c.tags, ...tags])];
	});
};
</script>

<style lang="scss" scoped>
@use "@/styles/shadow.scss" as shadow;

// 工具栏容器
.toolbar-wrap {
	padding: 6px;
	padding-top: 12px;
	background: rgba(255, 255, 255, 0.6);
	box-shadow: shadow.$elevation;
}

// 方案选择器样式
.pattern-selector {
	width: 150px;
}

// 排序方式选择器
.sort-method-selector {
	width: 130px;
}
// 控制按钮组样式
.control-button-group {
	height: fit-content;
}

// 控制组样式
.filter-control {
	flex: 0;
	display: flex;
	flex-flow: row nowrap;
	gap: 4px;
}

// 关键词过滤器
.keyword-filter-input {
	width: 180px;
}

// 类型、扩展名选择器样式
.type-select,
.ext-selector {
	width: 130px;
}

// 尺寸过滤器样式
.size-filter {
	flex: 0 0 100%;

	// 宽度和高度过滤器的通用样式
	.width-filter,
	.height-filter {
		flex: 1 0;
		min-width: 300px;
		max-width: 450px;
		font-size: 14px;
	}
}

// s loading样式
.toolbar-loading {
	width: 100%;
	display: block;
	/* transform: translateY(-20px); */
	margin: 0;
	height: 0;
	opacity: 0;
	visibility: hidden;

	transition:
		opacity 0.3s 2s ease,
		visibility 0.3s 2s ease,
		height 0.3s 2s ease,
		margin 0.3s 2s ease;

	&.loading-active {
		opacity: 1;
		height: 16px;
		margin: 4px 8px;
		visibility: visible;

		transition:
			opacity 0.3s ease,
			visibility 0.3s ease,
			height 0.3s ease,
			margin 0.3s ease;
	}

	:deep(.re-progress-bar__inner) {
		line-height: 0;
	}
}

// 样式修复
:deep(.re-badge) {
	display: block;
}
:deep(.re-n-badge-sup) {
	z-index: 5;
}

:deep(.re-n-base-select-option__content) {
	flex: 1;
}
:deep(.var-menu__menu) {
	width: max-content;
}
</style>
