<template>
	<BaseScrollbar
		:disable="!state.useCustomScrollbar"
		show-back-top-button
		overflow-x="hidden"
		auto-hidden
		ref="scrollBarRef"
		back-to-top-behavior="smooth"
	>
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="padding: 10px">
			<BaseVirtualGrid
				ref="gridRef"
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
						:show-to-locate-button="false"
						:show-delete-button="false"
						:show-download-button="(item as Card).source.meta.type !== 'html'"
						@change:selected="(item as Card).isSelected = $event"
						@change:title="updateCard([item as Card])"
						@loaded="handleLoaded"
						@download="handleDownload"
						@toggle-favorite="handleToggleFavorite(item as Card)"
						@save:tags="handleTagsSave(item as Card)"
						@dblclick="onCardDbClick((item as Card).id)"
						@contextmenu="onCardContextMenu($event, (item as Card).id)"
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
				</template>
			</BaseVirtualGrid>
		</div>
		<!-- f 瀑布流布局 -->
		<div v-if="layout === 'waterfall'" style="padding: 10px">
			<BaseVirtualMasonry
				ref="masonryRef"
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
						:show-to-locate-button="false"
						:show-delete-button="false"
						:show-download-button="(item.data as Card).source.meta.type!=='html'"
						@change:selected="(item.data as Card).isSelected = $event"
						@change:title="updateCard([item.data as Card])"
						@loaded="handleLoaded"
						@download="handleDownload"
						@toggle-favorite="handleToggleFavorite(item.data as Card)"
						@save:tags="handleTagsSave(item.data as Card)"
						@dblclick="onCardDbClick((item.data as Card).id)"
						@contextmenu="onCardContextMenu($event, (item.data as Card).id)"
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
			</BaseVirtualMasonry>
		</div>
	</BaseScrollbar>
</template>

<script setup lang="ts">
import {
	onMounted,
	onActivated,
	computed,
	reactive,
	useTemplateRef,
	onUnmounted,
	onDeactivated,
} from "vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import BaseVirtualGrid from "@/components/base/base-virtual-grid/base-virtual-grid.vue";
import BaseVirtualMasonry from "@/components/base/base-virtual-masonry/base-virtual-masonry.vue";
import type { Item as VirtualMasonryItem } from "@/components/base/base-virtual-masonry/type";
import GalleryCard from "@/components/utils/gallery-card.vue";
import Card from "@/stores/CardStore/class/Card";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";
import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
import { useClipboard } from "@vueuse/core";
import { ElNotification } from "element-plus";
import { Fancybox, configFancybox } from "@/plugin/fancyapps-ui";
import type { CarouselSlide } from "@fancyapps/ui";

import { storeToRefs } from "pinia";
import { useGlobalStore, useCardStore, useFavoriteStore } from "@/stores";
import { useBaseContextMenu } from "@/components/base/base-context-menu";

const globalStore = useGlobalStore();
const cardStore = useCardStore();
const favoriteStore = useFavoriteStore();

const { galleryState } = storeToRefs(globalStore);
const { updateCard, unFavoriteCard, refreshStore, findCardById } =
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

// s 滚动条组件引用
const scrollBarRef = useTemplateRef("scrollBarRef");
const gridRef = useTemplateRef("gridRef");
const masonryRef = useTemplateRef("masonryRef");

// s 组件状态数据
const state = reactive({
	// 列数
	columns: 5,
	// 是否使用自定义滚动条
	useCustomScrollbar: true,
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
	state.useCustomScrollbar = !state.isMobile;
});

onActivated(() => {
	state.isMobile = judgeIsMobile();
	state.useCustomScrollbar = !state.isMobile;
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
	// 需要返回的结果有效才进行更新
	if (info.meta.valid) {
		card.preview.meta = { ...card.preview.meta, ...info.meta };
		if (
			isEqualUrl(card.preview.url, card.source.url) &&
			(card.preview.meta.width > card.source.meta.width ||
				card.preview.meta.height > card.source.meta.height)
		) {
			card.source.meta = card.preview.meta;
			updateCard([card]);
		}
	}
};

// f 处理卡片标签变化
const handleTagsSave = async (card: Card) => {
	updateCard([card]);
};

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

// 定义Fancybox的默认类型
type FancyboxType =
	| "image"
	| "iframe"
	| "youtube"
	| "html"
	| "ajax"
	| "html5video"
	| "inline"
	| false;

function getFancyboxType(
	metaType: false | "image" | "video" | "audio" | "zip" | "html" | "other"
) {
	let type: FancyboxType = "iframe";
	if (!metaType) return type;
	switch (metaType) {
		case "image":
			type = "image";
			break;
		case "video":
			type = "html5video";
			break;
		case "html":
			type = "iframe";
			break;
		case "audio":
		case "zip":
		case "other":
		default:
			type = "inline";
	}

	return type;
}

// j 用于FancyBox的Item数据
const fancyboxItems = computed(() => {
	return props.cardList.map<Partial<CarouselSlide>>((card, index) => {
		const aspectRatio = card.source.meta.aspectRatio || 1;
		let type = getFancyboxType(card.source.meta.type);
		return {
			src: card.source.url,
			aspectRatio:
				type === "image" || type === "html5video"
					? `${aspectRatio}`
					: undefined,
			thumbSrc: card.preview.url,
			lazySrc: type === "html5video" ? card.preview.url : undefined,
			type,
			index,
		};
	});
});

// f 双击卡片的回调
async function onCardDbClick(id: string) {
	openFancybox(id);
}

// f 打开Fancybox
async function openFancybox(startId: string) {
	const index = props.cardList.findIndex((x) => x.id === startId);
	if (index < 0) return;

	const toolbar =
		typeof configFancybox.Carousel?.Toolbar === "object"
			? configFancybox.Carousel?.Toolbar
			: {};

	Fancybox.show(fancyboxItems.value, {
		...configFancybox,
		Carousel: {
			...configFancybox.Carousel,
			Toolbar: {
				...toolbar,
				items: {
					...toolbar.items,
					// f 定位按钮
					toLocate: {
						tpl: /*html*/ `
								<button class="f-button" title="{{TO_LOCATE}}">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="#222222"/>
									<path d="M12 5V3" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
									<path d="M19 12L21 12" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
									<path d="M12 21L12 19" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
									<path d="M3 12H5" stroke="#222222" stroke-width="2" stroke-linecap="round"/>
									</svg>
								</button>
							`,
						click(instance, _e) {
							const index = instance.getPageIndex();
							const slides = instance.getSlides();
							console.log("定位元素", slides[index]);
							// 关闭 Fancybox
							Fancybox.close();
							// 定位元素
							if (props.layout === "grid") {
								gridRef.value?.scrollToItem(props.cardList[index].id);
							} else {
								masonryRef.value?.scrollToItem(props.cardList[index].id);
							}
						},
					},
				},
			},
		},
		parentEl: scrollBarRef.value?.$el,
		startIndex: index,
		hideScrollbar: false,
	});
}

onUnmounted(() => Fancybox.close());
onDeactivated(() => Fancybox.close());

// 使用函数式组件右键菜单
const { showContextMenu } = useBaseContextMenu({
	root: () => scrollBarRef.value?.$el,
});

// f 卡片的右键菜单的回调
async function onCardContextMenu(event: PointerEvent, id: string) {
	const card = props.cardList.find((x) => x.id === id);
	if (!card) return;
	const options: Parameters<typeof showContextMenu>[1] = [
		{ label: "预览", command: "preview" },
		{ label: "打开源链接", command: "openSource" },
		{ label: "复制源链接", command: "copySource" },
		{ label: "打开预览链接", command: "openPreview" },
		{ label: "定位来源地址", command: "locateSourceAddress" },
		{ label: "取消收藏", command: "unfavorite" },
		{ label: "复制卡片数据", command: "copyCard" },
		{ label: "下载", command: "download" },
	] as const;

	type resultType = (typeof options)[number]["command"] | null;
	const result: resultType = await showContextMenu(event, options as any);
	if (result) {
		switch (result) {
			case "preview":
				openFancybox(id);
				break;
			case "openSource":
				window.open(card.source.url, "_blank");
				break;
			case "openPreview":
				window.open(card.preview.url, "_blank");
				break;
			case "locateSourceAddress":
				const url = card.source.originUrls![0];
				if (!url) break;
				window.open(url, "_blank");
				break;
			case "copySource":
			case "copyCard":
				const { copy } = useClipboard();
				copy(
					result === "copySource"
						? card.source.url
						: JSON.stringify(card.getRowData())
				)
					.then(() => {
						ElNotification({
							type: "success",
							title: "复制成功",
							message:
								result === "copySource"
									? card.source.url
									: `卡片数据：${card.description.title}`,
							appendTo: ".web-img-collector__notification-container",
						});
					})
					.catch(() => {
						ElNotification({
							type: "error",
							title: "复制失败",
							appendTo: ".web-img-collector__notification-container",
						});
					});
				break;
			case "unfavorite":
				handleToggleFavorite(card);
				break;
			case "download":
				handleDownload(id);
				break;
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
			object-position: top;
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
					object-position: top;
					height: 100%;
				}
			}
		}
		.base-video__container {
			height: 100%;
		}
	}
}
</style>
