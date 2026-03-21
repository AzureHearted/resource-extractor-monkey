<template>
	<n-flex ref="containerDOM" class="favorite__container" vertical :size="0">
		<!-- s 工具栏 -->
		<n-flex class="toolbar-wrap" :size="4">
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
			<n-badge :value="filterCardList.all.length" :max="999" type="info">
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
		</n-flex>
		<!-- s 内容区 -->
		<n-flex class="content-wrap" :size="4">
			<BaseTabs
				style="width: 100%; height: 100%"
				content-style="overflow:hidden;"
				:show-buttons="false"
				@change="nowType = $event as any"
			>
				<!-- s 图片类 -->
				<BaseTabPane name="image">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-mdi-images />
							</n-icon>
							图片
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.image.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<BaseCardList
						:card-list="filterCardList.image"
						:search-keywords="storeFilters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 视频类 -->
				<BaseTabPane name="video">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-animated-images-rounded />
							</n-icon>
							视频
							<n-badge
								:value="filterCardList.video.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<BaseCardList
						:card-list="filterCardList.video"
						:search-keywords="storeFilters.keyword"
						layout="waterfall"
					/>
				</BaseTabPane>
				<!-- s 压缩包类 -->
				<BaseTabPane name="zip">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-ant-design-file-zip-filled />
							</n-icon>
							压缩包
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.zip.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<BaseCardList
						:card-list="filterCardList.zip"
						:search-keywords="storeFilters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 网页类 -->
				<BaseTabPane name="html">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-dataset-linked />
							</n-icon>
							网页
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.html.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<BaseCardList
						:card-list="filterCardList.html"
						:search-keywords="storeFilters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 其他类 -->
				<BaseTabPane name="other">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-other-admission-outline />
							</n-icon>
							其他
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.unknown.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<BaseCardList
						:card-list="filterCardList.unknown"
						:search-keywords="storeFilters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
			</BaseTabs>
		</n-flex>
	</n-flex>
</template>

<script setup lang="ts">
import {
	h,
	reactive,
	onMounted,
	onActivated,
	nextTick,
	computed,
	ref,
} from "vue";
import type { VNodeChild } from "vue";
import { isMobile as judgeIsMobile } from "@/utils/common";
import type { SelectOption, SelectRenderTag, SliderProps } from "naive-ui";
import { NEllipsis, NTag, NBadge, NFlex } from "naive-ui";
import BaseCardList from "./favorite-base-card-list.vue";
import BaseTabs from "@/components/base/base-tabs/base-tabs.vue";
import BaseTabPane from "@/components/base/base-tabs/base-tab-pane.vue";

import { storeToRefs } from "pinia";

import useGlobalStore from "@/stores/GlobalStore";
const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

import useFavoriteStore from "@/stores/FavoriteStore";
import { useDebounceFn } from "@vueuse/core";
const favoriteStore = useFavoriteStore();
const {
	nowType,
	filterCardList,
	filters: storeFilters,
	extensionOptions,
	sortInfo,
	sizeRange,
} = storeToRefs(favoriteStore);

const { refreshStore } = favoriteStore;

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

// f 刷新
const reFresh = async () => {
	await refreshStore();
	filters.size.width[1] = sizeRange.value.width[1];
	filters.size.height[1] = sizeRange.value.height[1];
	storeFilters.value.size.width[1] = sizeRange.value.width[1];
	storeFilters.value.size.height[1] = sizeRange.value.height[1];
};

onMounted(() => {
	nextTick(() => {
		reFresh();
	});
});

onActivated(() => {
	nextTick(() => {
		reFresh();
	});
});

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

// todo 等待实现: 需要对收藏页面进行多级分类
</script>

<style lang="scss" scoped>
@use "@/styles/shadow.scss" as shadow;

.favorite__container {
	// position: relative;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.toolbar-wrap {
	padding: 6px;
	padding-top: 12px;
	background: rgba(255, 255, 255, 0.6);
	box-shadow: shadow.$elevation;
}

.content-wrap {
	flex: 1; // 必须设置用来撑满容器
	padding: 4px;
	overflow: hidden; // 必须要设置溢出隐藏
}

// 控制组样式
.control-group {
	display: flex;
	flex-flow: row nowrap;
	gap: 2px;
}

// 排序方式选择器
.sort-method-selector {
	width: 130px;
	:deep(.re-n-base-selection-input__content) {
		user-select: none;
	}
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

:deep(.base-tabs__tab-item) {
	font-size: 14px;
	padding: 0 10px;
}
</style>
