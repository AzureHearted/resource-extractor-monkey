<template>
	<BaseScrollbar
		:disable="!state.showScrollbar"
		show-back-top-button
		overflow-x="hidden"
		auto-hidden
		ref="container"
	>
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="padding: 10px">
			<BaseVirtualGrid
				:items="cardList"
				:gap="4"
				:columns="state.columns"
				allow-item-transition
				:scroll-container="container?.viewportDOM"
			>
				<template #="{ item, index }">
					<GalleryCard
						class="grid-item"
						:key="(item as Card).id"
						style="aspect-ratio: 1"
						v-model:data="(item as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						:observer-once="false"
						@change:selected="(item as Card).isSelected = $event"
						@delete="removeCard([$event])"
						@loaded="handleLoaded"
						@error="handleError"
						@download="handleDownload"
						@toggle-favorite="handleToFavorite((item as Card).id, $event)"
					/>
				</template>
			</BaseVirtualGrid>
		</div>
		<!-- f 瀑布流布局 -->
		<div v-if="layout === 'waterfall'" style="padding: 10px">
			<BaseWaterfall
				ref="waterFallRef"
				:items="waterfallItems"
				:breakpoints="breakpoints"
			>
				<template #default="{ index, item, loaded, mounted }">
					<GalleryCard
						v-model:data="(item.data as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						:observer-once="false"
						@change:selected="item.data.isSelected = $event"
						@delete="removeCard([$event])"
						@mounted="mounted(index)"
						@loaded="
							(id, info) => {
								loaded(index, info);
								handleLoaded(id, info);
							}
						"
						@download="handleDownload"
						@toggle-favorite="handleToFavorite(item.data.id, $event)"
					/>
				</template>
			</BaseWaterfall>
		</div>
	</BaseScrollbar>
</template>

<script setup lang="ts">
import {
	computed,
	onMounted,
	onActivated,
	useTemplateRef,
	reactive,
	onUnmounted,
} from "vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";
import GalleryCard from "@/components/utils/gallery-card.vue";
import Card from "@/stores/CardStore/class/Card";
import BaseWaterfall from "@/components/base/base-waterfall.vue";
import BaseVirtualGrid from "@/components/base/base-virtual-grid/base-virtual-grid.vue";

import type { Item as WaterfallItem } from "@/components/base/base-waterfall.vue";

import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
// ? 导入仓库
import useCardStore from "@/stores/CardStore";
import useFavoriteStore from "@/stores/FavoriteStore";

const props = withDefaults(
	defineProps<{
		cardList: Card[];
		layout?: "grid" | "waterfall"; // s 布局模式
		searchKeywords?: string; // s 检索关键词
	}>(),
	{
		cardList: () => [],
		layout: "grid",
	}
);

const breakpoints = {
	"0": 1,
	"320": 2,
	"480": 3,
	"768": 4,
	"1024": 5,
	"1200": 6,
	"1440": 7,
};

const container = useTemplateRef("container");

// s 卡片仓库
const cardStore = useCardStore();
const { findCard, removeCard, downloadCards } = cardStore;
// s 收藏仓库
const favoriteStore = useFavoriteStore();
const {
	refreshStore: refreshFavoriteStore,
	isExist: isFavorite,
	addCard: toFavoriteCard,
	unFavoriteCard,
} = favoriteStore;

const state = reactive({
	// 列数
	columns: 5,
	// s 是否显示滚动条
	showScrollbar: true,
	// s 移动端标识符
	isMobile: false,
});

onMounted(() => {
	state.isMobile = judgeIsMobile();
	state.showScrollbar = !state.isMobile;
});

onActivated(() => {
	state.isMobile = judgeIsMobile();
	state.showScrollbar = !state.isMobile;
});

// j 转为适用于瀑布流的数据
const waterfallItems = computed<Array<WaterfallItem>>(() => {
	return props.cardList
		.filter((x) => x.isMatch)
		.map<WaterfallItem>((c) => {
			const { id, source, preview } = c;
			const { url: sourceSrc, meta: sourceMeta } = source;
			const { meta: previewMeta } = preview;
			const {
				width: sourceWidth,
				height: sourceHeight,
				valid: sourceValid,
			} = sourceMeta;
			const { width: previewWidth, height: previewHeight } = previewMeta;
			return {
				id,
				src: sourceSrc,
				metadata: {
					width: sourceValid ? sourceWidth : previewWidth,
					height: sourceValid ? sourceHeight : previewHeight,
				},
				data: c,
			};
		});
});

// f 卡片加载成功完成事件( 1.更新cardStore的尺寸范围信息;2.判断卡片是否被收藏 )
const handleLoaded = async (id: string, info: ImgReadyInfo) => {
	// s 仓库找到对应的数据
	const card = findCard(id);
	if (!card) return; // * 如果卡片不存在也不在向下执行
	if (card.isLoaded) return; // * 如果已经成功加载过了就不在执行
	card.isLoaded = true; // s 置为加载成功
	// console.log("卡片加载完成", info, findCard(id));
	// s 刷新仓库对应卡片的preview.meta信息
	card.preview.meta = { ...card.preview.meta, ...info.meta };
	if (isEqualUrl(card.preview.url, card.source.url)) {
		card.source.meta = card.preview.meta;
	}
};

const handleError = async (id: string) => {
	// s 仓库找到对应的数据
	const card = findCard(id);
	if (!card) return; // * 如果卡片不存，则不在向下执行
	card.isLoaded = true;
};

// f 处理下载事件
const handleDownload = async (id: string) => {
	// console.log("下载", id);
	const card = findCard(id);
	if (!card) return;
	downloadCards([card]);
};

// f 处理收藏切换
const handleToFavorite = async (id: string, val: boolean) => {
	const card = findCard(id);
	if (!card) return;
	if (val) {
		card.isFavorite = true;
		toFavoriteCard([card]);
	} else {
		card.isFavorite = false;
		unFavoriteCard([card]);
	}
};

// * 激活时进行比对所有卡片收藏状态
onActivated(() => {
	requestAnimationFrame(async () => {
		await refreshFavoriteStore();
		props.cardList.forEach(async (c) => {
			c.isFavorite = await isFavorite(c);
		});
	});
});

onMounted(() => {
	container.value?.viewportDOM?.addEventListener("wheel", onMouseWheel, {
		passive: false,
	});

	onUnmounted(() => {
		container.value?.viewportDOM?.removeEventListener("wheel", onMouseWheel);
	});
});

// f 按住Ctrl滚动鼠标时改变列数
function onMouseWheel(e: WheelEvent) {
	console.log("改变列数");
	if (e.ctrlKey) {
		e.preventDefault();
		if (e.deltaY < 0) {
			if (state.columns - 1 > 0) {
				state.columns--;
			}
		} else {
			if (state.columns + 1 < 15) {
				state.columns++;
			}
		}
	}
}
</script>

<style lang="scss" scoped>
/* 修改网格布局样式 */
.grid-item {
	aspect-ratio: 1;
	overflow: hidden;
	border-radius: 4px;
	:deep(.img__container > .img__wrap) {
		aspect-ratio: 1;
		/* overflow: hidden; */
		img {
			object-fit: cover;
			height: 100%;
		}
	}
}

/* 修改瀑布流默认样式 */
:deep(.base-waterfall__container) {
	.base-card__container {
		padding: unset;
		&::after,
		&:focus::after {
			display: none;
		}
	}
}
.waterfall-item {
	overflow: hidden;
	border-radius: 4px;
}
</style>
