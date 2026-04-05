<template>
	<n-flex
		ref="toolbarRef"
		class="toolbar-wrap"
		:data-theme="globalStore.theme"
		:size="4"
	>
		<!-- s 方案选择器 -->
		<n-select
			class="pattern-selector"
			v-model:value="patternStore.current.id"
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
				<n-button-group type="primary">
					<!-- s 加载按钮 -->
					<n-button @click.stop="getCards" v-if="!loadingStore.loading">
						加载
					</n-button>
					<n-button @click.stop="stopGetCards" v-else> 停止 </n-button>
					<n-button style="padding: 0 4px">
						<icon-material-symbols-arrow-drop-down-rounded
							style="font-size: 24px"
						/>
					</n-button>
				</n-button-group>
				<template #menu>
					<var-cell
						v-if="!loadingStore.loading"
						@click="reload"
						title="重新加载"
						ripple
					>
						<template #icon>
							<icon-ant-design-reload-outlined style="margin-right: 6px" />
						</template>
					</var-cell>
					<var-cell @click="resetFilters" title="重置过滤器" ripple>
						<template #icon>
							<icon-material-symbols:reset-settings-rounded
								style="margin-right: 6px"
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
							<icon-mdi-delete-empty style="margin-right: 6px; color: red" />
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
			:value="filterCardList.all.length"
			:offset="[-14, 0]"
			:max="999"
			type="info"
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
		<!-- s 选择器 -->
		<n-badge
			:offset="[-116, 0]"
			type="success"
			:max="999"
			:show="!!currentCardList.length"
			:value="currentCardList.length"
			style="align-items: center"
		>
			<!-- 选择器按钮组 -->
			<n-button-group>
				<n-button type="primary" @click="checkAll"> 全选 </n-button>
				<n-button type="info" @click="inverseAll"> 反选 </n-button>
				<n-button @click="cancel"> 取消 </n-button>
			</n-button-group>
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
				<n-button-group type="primary">
					<n-button
						:disabled="!checkedCardList.length"
						@click.stop="downloadSelected"
					>
						下载
					</n-button>
					<n-button
						v-if="!!currentCardList.length"
						:disabled="!currentCardList.length || loadingStore.loading"
						style="padding: 0 4px"
					>
						<icon-material-symbols-arrow-drop-down-rounded
							style="font-size: 24px"
						/>
					</n-button>
				</n-button-group>
				<template #menu>
					<var-cell
						title="全部下载"
						v-if="!!currentCardList.length"
						@click="downloadAll"
						ripple
					>
						<template #icon>
							<icon-mdi-auto-download style="margin-right: 6px" />
						</template>
					</var-cell>
					<var-cell
						title="删除选中项"
						@click="deleteSelected"
						v-if="!!checkedCardList.length"
						ripple
					>
						<template #icon>
							<icon-mdi-delete-sweep style="margin-right: 6px; color: red" />
						</template>
					</var-cell>
					<var-cell
						title="收藏选中项"
						@click="favoriteSelected"
						v-if="!!checkedCardList.length"
						ripple
					>
						<template #icon>
							<icon-mdi-book-favorite
								style="margin-right: 6px; color: purple"
							/>
						</template>
					</var-cell>
				</template>
			</var-menu>
		</n-badge>
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
		<n-progress
			class="toolbar-loading"
			:class="{ 'loading-active': loadingStore.loading }"
			type="line"
			:percentage="Number(loadingStore.percentage.toFixed(2))"
			indicator-placement="outside"
			processing
		>
		</n-progress>
	</n-flex>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted, computed, watch, onActivated } from "vue";
import type { VNodeChild } from "vue";
import { NTag, NBadge } from "naive-ui";
import type { SelectOption, SelectRenderTag, SliderProps } from "naive-ui";
import { Pattern } from "@/models/Pattern/Pattern";
import { BaseImg } from "base-ui";

import { useDialog, useNotification } from "@/plugin/naive-ui";

const dialog = useDialog();
const notification = useNotification();

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
		if (!patternStore.current.id.includes("#")) reload();
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

// 当前卡片列表
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
		return ` (${byteAutoUnit(totalByte)})${existUnDownload ? " 有未下载" : ""}`;
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
	const pattern = patternStore.getCurrentPattern();
	if (pattern == null) return;
	stopGetCardsFlag.value = false;
	await cardStore.getPageCard(pattern, {
		stopFlag: stopGetCardsFlag,
		notification,
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
	if (cards.length > 1) {
		cardStore.downloadCards(cards, { dialog, notification });
	} else if (cards.length === 1) {
		cardStore.downloadCard(cards[0], { dialog });
	}
}

// f 下载全部
function downloadAll() {
	const cards = filterCardList.value[nowType.value] || [];
	if (cards.length > 1) {
		cardStore.downloadCards(cards, { dialog, notification });
	} else if (cards.length === 1) {
		cardStore.downloadCard(cards[0], { dialog });
	}
}

// f 删除选中项
function deleteSelected() {
	const ids = selectionCardList.value[nowType.value].map((x) => x.id);
	cardStore.removeCard(ids);
}

// f 收藏选中项
function favoriteSelected() {
	favoriteStore.favorite(selectionCardList.value[nowType.value]); // 添加卡片到Favorite仓库
	selectionCardList.value[nowType.value].forEach(
		(card) => (card.isFavorite = true),
	); // 更新卡片收藏状态
}
</script>

<style lang="scss" scoped>
// 工具栏容器
.toolbar-wrap {
	padding: 6px;
	padding-top: 12px;
	background: rgba(getTheme(light, background), 0.35);
	// box-shadow: getTheme(light, box-shadow);

	// 暗色主题
	&[data-theme="dark"] {
		background: rgba(getTheme(dark, background), 0.5);
		// box-shadow: getTheme(dark, box-shadow);
	}
}

// 方案选择器样式
.pattern-selector {
	width: 150px;
}

// 排序方式选择器
.sort-method-selector {
	width: 130px;
	:deep(.re-n-base-selection-input__content) {
		user-select: none;
	}
}

// 关键词过滤器
.keyword-filter-input {
	width: 180px;
}

// 类型、扩展名选择器样式
.type-select,
.ext-selector {
	width: 150px;

	:deep(.re-n-base-select-option__content) {
		flex: 1;
	}
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
		margin: 0 10px;
		visibility: visible;

		transition:
			opacity 0.3s ease,
			visibility 0.3s ease,
			height 0.3s ease,
			margin 0.3s ease;
	}
}
</style>
