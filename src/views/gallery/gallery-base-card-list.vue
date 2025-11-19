<template>
	<BaseScrollbar
		ref="scrollbarRef"
		:show-scrollbar="showScrollbar"
		show-back-top-button>
		<!-- f 普通网格布局 -->
		<GridList v-if="layout === 'Grid'" :data="cardList">
			<template #default="{ item }">
				<GalleryCard
					v-model:data="(item as Card)"
					:highlight-key="searchKeywords"
					:is-mobile="isMobile"
					img-object-fit="cover"
					:set-aspect-ratio="1"
					@change:selected="item.isSelected = $event"
					@delete="removeCard([$event])"
					@loaded="handleLoaded"
					@error="handleError"
					@download="handleDownload"
					@toggle-favorite="handleToFavorite(item.id, $event)" />
			</template>
		</GridList>
		<!-- f 瀑布流布局 -->
		<WaterFallList
			v-if="layout === 'WaterFall'"
			ref="waterFallRef"
			:data="cardList.filter((x) => x.isMatch)"
			item-padding="2px">
			<template #default="{ item }">
				<GalleryCard
					v-model:data="(item as Card)"
					:highlight-key="searchKeywords"
					:is-mobile="isMobile"
					@change:selected="item.isSelected = $event"
					@delete="removeCard([$event])"
					@loaded="handleLoaded"
					@download="handleDownload"
					@toggle-favorite="handleToFavorite(item.id, $event)" />
			</template>
		</WaterFallList>
	</BaseScrollbar>
	<!-- <BaseDock></BaseDock> -->
</template>

<script setup lang="ts">
	import { ref, watch, nextTick, onMounted, onActivated } from "vue";
	import WaterFallList from "@/components/utils/waterfall-card-list.vue";
	import GridList from "@/components/utils/grid-card-list.vue";
	import BaseScrollbar from "@/components/base/base-scrollbar.vue";
	import BaseDock from "@/components/base/base-dock.vue";
	import type { returnInfo } from "@/components/base/base-img.vue";
	import GalleryCard from "@/components/utils/gallery-card.vue";
	import Card from "@/stores/CardStore/class/Card";

	import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
	// i 导入仓库
	import useCardStore from "@/stores/CardStore";
	import useFavoriteStore from "@/stores/FavoriteStore";

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

	// s 滚动条组件的Ref
	const scrollbarRef = ref<InstanceType<typeof BaseScrollbar> | null>(null);
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

	// w 手动刷新showScrollbar,临时解决scrollbar组件中wrapper的scroll尺寸未及时更新的bug
	// watch(
	// 	() => props.cardList,
	// 	(newList, oldList) => {
	// 		if (scrollbarRef.value && newList.length === 0 && oldList.length > 0) {
	// 			showScrollbar.value = !showScrollbar.value;
	// 			nextTick(() => {
	// 				setTimeout(() => {
	// 					showScrollbar.value = !showScrollbar.value;
	// 				}, 1000);
	// 			});
	// 		}
	// 	}
	// );

	// s 瀑布流组件实例
	const waterFallRef = ref<InstanceType<typeof WaterFallList> | null>(null);

	// f 卡片加载成功完成事件( 1.更新cardStore的尺寸范围信息;2.判断卡片是否被收藏 )
	const handleLoaded = async (id: string, info: returnInfo) => {
		// s 仓库找到对应的数据
		const card = findCard(id);
		if (!card) return; //* 如果卡片不存在也不在向下执行
		if (card.isLoaded) return; //* 如果已经成功加载过了就不在执行
		card.isLoaded = true; // s 置为加载成功
		// console.log("卡片加载完成", info);
		// s 刷新仓库对应卡片的preview.meta信息
		card.preview.meta = { ...card.preview.meta, ...info.meta };
		if (isEqualUrl(card.preview.url, card.source.url)) {
			card.source.meta = card.preview.meta;
		}
		// s 先刷新仓库数据
		// await refreshFavoriteStore();
		// s 卡片加载完成后手动刷新一次瀑布流
		// waterFallRef.value?.handleResetPosition();
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
	onActivated(async () => {
		await refreshFavoriteStore();
		props.cardList.forEach(async (c) => {
			c.isFavorite = await isFavorite(c);
		});
	});
</script>

<style lang="scss" scoped></style>
