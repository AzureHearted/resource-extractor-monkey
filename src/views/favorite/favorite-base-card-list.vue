<template>
	<BaseScrollbar
		:disable="!showScrollbar"
		show-back-top-button
		overflow-x="hidden"
		auto-hidden
	>
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="padding: 10px">
			<BaseGrid :gap="4" :breakpoints="breakpoints">
				<GalleryCard
					class="grid-item"
					v-for="(item, index) in cardList"
					:key="item.id"
					v-model:data="cardList[index]"
					:highlight-key="searchKeywords"
					img-object-fit="cover"
					:set-aspect-ratio="1"
					:is-mobile="isMobile"
					:observer-once="false"
					:show-to-locate-button="false"
					:show-delete-button="false"
					:show-download-button="item.source.meta.type !== 'html'"
					@change:selected="item.isSelected = $event"
					@change:title="updateCard([item])"
					@loaded="handleLoaded"
					@download="handleDownload"
					@toggle-favorite="handleToggleFavorite(item)"
					@save:tags="handleTagsSave(item)"
					@delete="deleteCard([item])"
				>
					<template #custom-button="{ openUrl }">
						<el-button
							type="warning"
							@click="openUrl((item as Card).source.originUrls![0])"
							title="打开卡片对应的来源地址"
							v-ripple
						>
							<template #icon>
								<icon-material-symbols-open-in-new-down-rounded />
							</template>
						</el-button>
					</template>
				</GalleryCard>
			</BaseGrid>
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
						class="waterfall-item"
						v-model:data="(item.data as Card)"
						:highlight-key="searchKeywords"
						:is-mobile="isMobile"
						:observer-once="false"
						:show-to-locate-button="false"
						:show-delete-button="false"
						:show-download-button="(item.data as Card).source.meta.type!=='html'"
						@change:selected="item.data.isSelected = $event"
						@change:title="updateCard([item.data as Card])"
						@mounted="mounted(index)"
						@loaded="
							(id, info) => {
								loaded(index, info);
								handleLoaded(id, info);
							}
						"
						@download="handleDownload"
						@toggle-favorite="handleToggleFavorite(item.data as Card)"
						@save:tags="handleTagsSave(item.data as Card)"
						@delete="deleteCard([item.data as Card])"
					>
						<template #custom-button="{ openUrl }">
							<el-button
								type="warning"
								@click="openUrl((item.data as Card).source.originUrls![0])"
								title="打开卡片对应的来源地址"
								v-ripple
							>
								<template #icon>
									<icon-material-symbols-open-in-new-down-rounded />
								</template>
							</el-button>
						</template>
					</GalleryCard>
				</template>
			</BaseWaterfall>
		</div>
	</BaseScrollbar>
</template>

<script setup lang="ts">
import {
	ref,
	defineProps,
	withDefaults,
	onMounted,
	onActivated,
	computed,
} from "vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import BaseGrid from "@/components/base/base-grid.vue";
import BaseWaterfall from "@/components/base/base-waterfall.vue";
import type { Item as WaterfallItem } from "@/components/base/base-waterfall.vue";
import GalleryCard from "@/components/utils/gallery-card.vue";
import Card from "@/stores/CardStore/class/Card";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";

import useCardStore from "@/stores/CardStore";
import useFavoriteStore from "@/stores/FavoriteStore";
import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";

const cardStore = useCardStore();
const favoriteStore = useFavoriteStore();

const { updateCard, deleteCard, unFavoriteCard, refreshStore, findCardById } =
	favoriteStore;
const { downloadCards } = cardStore;

const props = withDefaults(
	defineProps<{
		cardList: Card[];
		layout?: "grid" | "waterfall"; // s 布局模式
		searchKeywords?: string; // s 检索关键词
	}>(),
	{
		cardList: () => [],
		layout: "grid",
		searchKeywords: "",
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

// f 处理卡片下载
const handleDownload = async (id: string) => {
	// console.log("下载", id);
	const card = await findCardById(id);
	if (!card) return;
	// console.log("找到card", card);
	await downloadCards([card]);
	// 更新卡片
	updateCard([card]);
};

// f 处理收藏/取消收藏
const handleToggleFavorite = (card: Card) => {
	unFavoriteCard([card]);
	refreshStore();
};

// f 卡片加载成功完成事件( 1.更新cardStore的尺寸范围信息;2.判断卡片是否被收藏 )
const handleLoaded = async (id: string, info: ImgReadyInfo) => {
	// s 仓库找到对应的数据
	const card = await findCardById(id);
	if (!card) return; //* 如果卡片不存在也不在向下执行
	if (card.isLoaded) return; //* 如果已经成功加载过了就不在执行
	card.isLoaded = true; // s 置为加载成功
	// console.count("卡片加载完成");
	// s 刷新仓库对应卡片的preview.meta信息
	card.preview.meta = { ...card.preview.meta, ...info.meta };
	if (
		isEqualUrl(card.preview.url, card.source.url) &&
		(card.preview.meta.width > card.source.meta.width ||
			card.preview.meta.height > card.source.meta.height)
	) {
		card.source.meta = card.preview.meta;
		updateCard([card]);
	}
};

// f 处理卡片标签变化
const handleTagsSave = async (card: Card) => {
	updateCard([card]);
};
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
