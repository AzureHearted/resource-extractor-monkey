<template>
	<n-flex class="toolbar-wrap" :data-theme="theme" :size="4">
		<!-- s 排序方式选择 -->
		<n-select
			class="sort-method-selector"
			v-model:value="sortInfo.method"
			placeholder="请选择一个排序方式"
			:to="false"
			:options="sortInfo.groups"
		/>
		<!-- s 扩展名过滤器 -->
		<n-select
			v-if="nowType !== 'html'"
			class="ext-selector"
			v-model:value="storeFilters.extension"
			placeholder="扩展名过滤"
			multiple
			clearable
			:to="false"
			:render-tag="renderTag"
			:render-label="renderOptionLabelWithCount"
			:options="extensionOptions"
			max-tag-count="responsive"
		/>
		<!-- s 关键词过滤 -->
		<n-badge
			class="keyword-filter-input"
			:value="filterCardList.all.length"
			:max="999"
			type="info"
			:offset="[-14, 0]"
		>
			<n-input
				style="width: 180px"
				v-model:value="storeFilters.keyword"
				type="text"
				placeholder="输入检索关键词"
				clearable
				@update:value="handleKeywordFilter()"
				@keydown.enter="handleKeywordFilter()"
				@clear="handleKeywordFilter('')"
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
			<n-button-group class="control-button-group">
				<n-button type="primary" @click="selectAll"> 全选 </n-button>
				<n-button type="info" @click="inverseSelectAll"> 反选 </n-button>
				<n-button @click="cancelSelect"> 取消 </n-button>
			</n-button-group>
		</n-badge>
		<!-- s 下载控制 -->
		<n-badge
			:offset="[0, 2]"
			:max="999"
			:show="!!selectionCards.length"
			:value="`${selectionCards.length}${checkedTotalSizeTip}`"
			style="align-items: center"
		>
			<var-menu
				placement="bottom-start"
				:trigger="isMobile ? 'click' : 'hover'"
				:teleport="false"
			>
				<n-button-group type="primary">
					<n-button
						:disabled="!selectionCards.length"
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
						@click="unFavoriteSelected"
						v-if="!!selectionCards.length"
						ripple
					>
						<template #icon>
							<icon-mdi-delete-sweep style="margin-right: 6px; color: red" />
						</template>
					</var-cell>
				</template>
			</var-menu>
		</n-badge>
		<!-- s 尺寸过滤器 -->
		<n-flex
			v-if="nowType === 'image' || nowType === 'video'"
			class="size-filter"
		>
			<!-- s 宽度过滤器 -->
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
			<!-- s 高度过滤器 -->
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
import type { Card } from "@/models";
import { useDialog, useNotification } from "@/plugin/naive-ui";
import { useFavoriteStore, useGlobalStore, useLoadingStore } from "@/stores";
import { byteAutoUnit, isMobile as judgeIsMobile } from "@/utils";
import { useDebounceFn } from "@vueuse/core";
import type { SelectOption, SelectRenderTag, SliderProps } from "naive-ui";
import { NBadge, NEllipsis, NTag } from "naive-ui";
import { storeToRefs } from "pinia";
import {
	computed,
	h,
	nextTick,
	onActivated,
	onMounted,
	reactive,
	ref,
	type VNodeChild,
} from "vue";

const dialog = useDialog();
const notification = useNotification();

const globalStore = useGlobalStore();
const { theme } = storeToRefs(globalStore);

const loadingStore = useLoadingStore();

const favoriteStore = useFavoriteStore();
const {
	nowType,
	filterCardList,
	filters: storeFilters,
	extensionOptions,
	sortInfo,
	sizeRange,
	selectionCardList,
} = storeToRefs(favoriteStore);

const { refreshStore, update: updateCard } = favoriteStore;

// s 移动端标识符
const isMobile = ref(false);
onMounted(() => {
	isMobile.value = judgeIsMobile();
});
onActivated(() => {
	isMobile.value = judgeIsMobile();
});

// s 过滤器定义(组件内过滤器)
const filters = reactive({
	size: {
		width: [storeFilters.value.size.width[0], storeFilters.value.size.width[1]],
		height: [
			storeFilters.value.size.height[0],
			storeFilters.value.size.height[1],
		],
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
	const keyword = value !== undefined ? value : storeFilters.value.keyword;
	console.log("触发关键词过滤", keyword);
	storeFilters.value.keyword = keyword;
};

// f 全选
function selectAll() {
	const set = new Set(favoriteStore.data.selectedCardIdSet);
	filterCardList.value[nowType.value].forEach((c) => set.add(c.id));
	favoriteStore.data.selectedCardIdSet = set;
}

// f 反选
function inverseSelectAll() {
	const set = new Set(favoriteStore.data.selectedCardIdSet);
	filterCardList.value[nowType.value].forEach((c) => {
		if (set.has(c.id)) {
			set.delete(c.id);
		} else {
			set.add(c.id);
		}
	});
	favoriteStore.data.selectedCardIdSet = set;
}

// f 取消
function cancelSelect() {
	const set = new Set(favoriteStore.data.selectedCardIdSet);
	filterCardList.value[nowType.value].forEach((c) => set.delete(c.id));
	favoriteStore.data.selectedCardIdSet = set;
}

// f 选择器多选Tag渲染函数
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

// f 带数量的选项标签渲染函数
const renderOptionLabelWithCount = (option: SelectOption): VNodeChild => {
	return h(
		"div",
		{
			style: "display:flex; align-items: center;width:100%;",
		},
		[
			h(NEllipsis, {}, { default: () => option.label as string }),
			h(
				NBadge,
				{
					type: "info",
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

// f 刷新
async function refresh() {
	await refreshStore();
	filters.size.width[1] = sizeRange.value.width[1];
	filters.size.height[1] = sizeRange.value.height[1];
	storeFilters.value.size.width[1] = sizeRange.value.width[1];
	storeFilters.value.size.height[1] = sizeRange.value.height[1];
}

onActivated(async () => {
	await nextTick();
	refresh();
});

const currentCardList = computed<Card[]>(() => {
	return filterCardList.value[nowType.value] ?? [];
});

// 被勾选的卡片
const selectionCards = computed<Card[]>(() => {
	return selectionCardList.value[nowType.value] ?? [];
});

// 计算被选中的卡片对应的体积大小总和
const checkedTotalSizeTip = computed(() => {
	let existUnDownload = false; // 标记是否存在为下载的卡片
	// 先计算尺寸大小
	const totalByte = selectionCards.value.reduce((total, curr) => {
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

// f 下载选中项
async function downloadSelected() {
	const cards = selectionCardList.value[nowType.value] || [];
	if (cards.length > 1) {
		await favoriteStore.downloadCards(cards, {
			dialog,
			notification,
			initZipName: `RE收藏集 ${new Date().toJSON().replace(/T/g, "_T").replace(/:/g, "_")}`,
		});
	} else if (cards.length === 1) {
		await favoriteStore.downloadCard(cards[0], { dialog });
	}
	// 最后同步跟新数据库数据
	updateCard(cards);
}

// f 下载全部
async function downloadAll() {
	const cards = filterCardList.value[nowType.value] || [];
	if (cards.length > 1) {
		await favoriteStore.downloadCards(cards, {
			dialog,
			notification,
			initZipName: `RE收藏集 ${new Date().toJSON().replace(/T/g, "_T").replace(/:/g, "_")}`,
		});
	} else if (cards.length === 1) {
		await favoriteStore.downloadCard(cards[0], { dialog });
	}
	// 最后同步跟新数据库数据
	updateCard(cards);
}

// f 移除选中项
async function unFavoriteSelected() {
	const cards = selectionCardList.value[nowType.value];

	const res = await new Promise<boolean>((resolve) => {
		dialog.warning({
			title: "移除收藏",
			content: `确定要取消对选中的 ${cards.length}张 卡片的收藏吗？(此操作无法撤销)`,
			positiveText: "确定",
			negativeText: "取消",
			draggable: true,
			onPositiveClick: () => resolve(true),
			onNegativeClick: () => resolve(false),
			onMaskClick: () => resolve(false),
			onClose: () => resolve(false),
			onEsc: () => resolve(false),
		});
	});

	if (!res) return;

	favoriteStore.unfavorite(cards);
}
</script>

<style lang="scss" scoped>
.toolbar-wrap {
	padding: 6px;
	padding-top: 12px;
	background: rgba(getTheme(light, background), 0.35);
	// box-shadow: getTheme(light, box-shadow);

	&[data-theme="dark"] {
		background: rgba(getTheme(dark, background), 0.5);
		// box-shadow: getTheme(dark, box-shadow);
	}
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
	text-wrap: nowrap;

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
