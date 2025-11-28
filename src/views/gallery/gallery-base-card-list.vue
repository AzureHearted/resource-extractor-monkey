<template>
	<BaseScrollbar
		:disable="!showScrollbar"
		show-back-top-button
		overflow-x="hidden"
		auto-hidden
		ref="container"
	>
		<!-- f 普通网格布局 -->
		<GridList v-if="layout === 'Grid'" :data="cardList">
			<template #default="{ item }">
				<GalleryCard
					style="aspect-ratio: 1"
					v-model:data="(item as Card)"
					:highlight-key="searchKeywords"
					:is-mobile="isMobile"
					:observer-once="false"
					@change:selected="item.isSelected = $event"
					@delete="removeCard([$event])"
					@loaded="handleLoaded"
					@error="handleError"
					@download="handleDownload"
					@toggle-favorite="handleToFavorite(item.id, $event)"
				/>
			</template>
		</GridList>
		<!-- f 瀑布流布局 -->
		<div v-if="layout === 'WaterFall'" style="padding: 10px">
			<BaseWaterfall ref="waterFallRef" :items="waterfallItems" :columns="6">
				<template #default="{ index, item, loaded, mounted }">
					<GalleryCard
						v-model:data="(item.data as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="isMobile"
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
	<!-- <BaseDock></BaseDock> -->
</template>

<script setup lang="ts">
import {
	ref,
	watch,
	nextTick,
	computed,
	useTemplateRef,
	onMounted,
	onActivated,
	onUpdated,
	onUnmounted,
	onDeactivated,
} from "vue";
import GridList from "@/components/utils/grid-card-list.vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";
import GalleryCard from "@/components/utils/gallery-card.vue";
import Card from "@/stores/CardStore/class/Card";
import BaseWaterfall from "@/components/base/base-waterfall.vue";
import type { Item as WaterfallItem } from "@/components/base/base-waterfall.vue";

import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
// i 导入仓库
import useCardStore from "@/stores/CardStore";
import useFavoriteStore from "@/stores/FavoriteStore";
import { info } from "console";

const props = withDefaults(
	defineProps<{
		cardList: Card[];
		layout?: "Grid" | "WaterFall"; // s 布局模式
		searchKeywords?: string; // s 检索关键词
	}>(),
	{
		cardList: () => [],
		layout: "Grid",
	}
);

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

// s 是否显示滚动条
const showScrollbar = ref(true);

// s 移动端标识符
const isMobile = ref(false);
onMounted(() => {
	isMobile.value = judgeIsMobile();
	showScrollbar.value = !isMobile.value;
});

onActivated(() => {
	isMobile.value = judgeIsMobile();
	showScrollbar.value = !isMobile.value;
});

// 转为适用于瀑布流的数据
const waterfallItems = computed<Array<WaterfallItem>>(() => {
	return props.cardList
		.filter((x) => x.isMatch)
		.map<WaterfallItem>((c) => {
			const { id, source, preview } = c;
			const { url: sourceSrc, meta: sourceMeta } = source;
			const { url: previewSrc, meta: previewMeta } = preview;
			const {
				width: sourceWidth,
				height: sourceHeight,
				valid: sourceValid,
			} = sourceMeta;
			const {
				width: previewWidth,
				height: previewHeight,
				valid: previewValid,
			} = previewMeta;
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
	if (!card) return; //* 如果卡片不存在也不在向下执行
	if (card.isLoaded) return; //* 如果已经成功加载过了就不在执行
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
	if (!card) return; //* 如果卡片不存在也不在向下执行
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

//* 激活时进行比对所有卡片收藏状态
onActivated(() => {
	requestAnimationFrame(async () => {
		await refreshFavoriteStore();
		props.cardList.forEach(async (c) => {
			c.isFavorite = await isFavorite(c);
		});
	});
});
</script>

<style lang="scss" scoped>
/* 修改瀑布流默认样式 */
:deep(.base-waterfall__container) {
	.base-card__container {
		padding: unset;

		&::after,
		&:focus::after {
			display: none;
		}
	}

	.img__container {
		display: flex !important;
	}
}
</style>
