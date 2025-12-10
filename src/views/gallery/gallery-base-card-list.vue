<template>
	<BaseScrollbar
		:disable="!state.showScrollbar"
		show-back-top-button
		overflow-x="hidden"
		auto-hidden
		ref="scrollBarRef"
		back-to-top-behavior="smooth"
	>
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="padding: 10px">
			<BaseVirtualGrid
				:items="cardList"
				:gap="4"
				:columns="state.columns"
				:allow-item-transition="galleryState.allowTransition"
				:scroll-container="scrollBarRef?.viewportDOM"
			>
				<template #="{ item }">
					<GalleryCard
						:key="(item as Card).id"
						v-model:data="(item as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
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
			<BaseVirtualMasonry
				:items="virtualMasonryItem"
				:gap="4"
				:columns="state.columns"
				:allow-item-transition="galleryState.allowTransition"
				:scroll-container="scrollBarRef?.viewportDOM"
			>
				<template #="{ item }">
					<GalleryCard
						v-model:data="(item.data as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						@change:selected="(item.data as Card).isSelected = $event"
						@delete="removeCard([$event])"
						@loaded="handleLoaded"
						@download="handleDownload"
						@toggle-favorite="handleToFavorite((item.data as Card).id, $event)"
					/>
				</template>
			</BaseVirtualMasonry>
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
import BaseVirtualGrid from "@/components/base/base-virtual-grid/base-virtual-grid.vue";
import BaseVirtualMasonry from "@/components/base/base-virtual-masonry/base-virtual-masonry.vue";
import type { Item as VirtualMasonryItem } from "@/components/base/base-virtual-masonry/type";

import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
// ? 导入仓库
import { storeToRefs } from "pinia";
import { useGlobalStore, useCardStore, useFavoriteStore } from "@/stores";

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);
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

// s 滚动条组件引用
const scrollBarRef = useTemplateRef("scrollBarRef");

// s 组件状态数据
const state = reactive({
	// 列数
	columns: 5,
	// 是否显示滚动条
	showScrollbar: true,
	// 移动端标识符
	isMobile: false,
	// 断点
	breakpoints: {
		"0": 1,
		"320": 2,
		"480": 3,
		"768": 4,
		"1024": 5,
		"1200": 6,
		"1440": 7,
	},
});

onMounted(() => {
	state.isMobile = judgeIsMobile();
	state.showScrollbar = !state.isMobile;
});

onActivated(() => {
	state.isMobile = judgeIsMobile();
	state.showScrollbar = !state.isMobile;
});

// j 转为适用于虚拟瀑布流的数据列表
const virtualMasonryItem = computed<Array<VirtualMasonryItem>>(() => {
	return props.cardList.map<VirtualMasonryItem>((c) => {
		const { id, source, preview } = c;
		const { url: sourceSrc } = source;
		const { meta: previewMeta } = preview;
		const { valid: previewValid } = previewMeta;

		const { width: previewWidth, height: previewHeight } = previewMeta;

		let aspectRatio = 1;
		if (
			(previewMeta.type === "image" || previewMeta.type === "video") &&
			previewValid
		) {
			aspectRatio = previewWidth / previewHeight || 1;
		}

		return {
			id,
			src: sourceSrc,
			aspectRatio,
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
	if (info.meta.valid) {
		card.preview.meta = { ...card.preview.meta, ...info.meta };
		if (isEqualUrl(card.preview.url, card.source.url)) {
			card.source.meta = card.preview.meta;
		}
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
		// 先属性收藏仓库
		await refreshFavoriteStore();
		// 更新收藏状态
		props.cardList.forEach(async (card) => {
			card.isFavorite = await isFavorite(card);
		});
	});
});

onMounted(() => {
	scrollBarRef.value?.viewportDOM?.addEventListener("wheel", onMouseWheel, {
		passive: false,
	});

	onUnmounted(() => {
		scrollBarRef.value?.viewportDOM?.removeEventListener("wheel", onMouseWheel);
	});
});

// f 按住Ctrl滚动鼠标时改变列数
function onMouseWheel(e: WheelEvent) {
	// console.log("改变列数");
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
/* 修改虚拟Grid布局内的卡片样式 */
:deep(.base-virtual-grid__wrap) {
	.base-img__container > .base-img__wrap {
		aspect-ratio: 1;
		img {
			object-fit: cover;
			height: 100%;
		}
	}
}

/* 修改虚拟瀑布内的卡片样式 */
:deep(.base-virtual-masonry__wrap) {
	.base-card__container {
		height: 100%;
		.base-card__content {
			flex-grow: 1;
		}
		.base-img__container {
			height: 100%;
			.base-img__wrap {
				height: 100%;
				img {
					object-fit: cover;
					height: 100%;
				}
			}
		}
	}
}
</style>
