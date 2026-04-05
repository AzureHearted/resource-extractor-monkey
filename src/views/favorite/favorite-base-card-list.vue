<template>
	<div ref="scrollBarRef" style="height: 100%">
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="height: 100%">
			<BaseVirtualGrid
				style="padding: 10px"
				ref="gridRef"
				:items="cardList"
				:gap="4"
				:columns="!state.isMobile ? galleryState.column : undefined"
				:breakpoints="state.isMobile ? state.breakpoints : undefined"
				:allow-item-transition="galleryState.allowTransition"
			>
				<template #="{ item, isSkeleton }">
					<GalleryCard
						:key="(item as FavoriteCard).id"
						v-model:data="item as FavoriteCard"
						:is-skeleton="isSkeleton"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						:show-to-locate-button="false"
						:show-delete-button="false"
						:show-download-button="
							(item as FavoriteCard).source.meta.type !== 'html'
						"
						@change:title="updateCard([item as FavoriteCard])"
						@loaded="handleLoaded"
						@download="handleDownloadCard"
						@toggle-favorite="handleToggleFavorite(item as FavoriteCard)"
						@save:tags="handleTagsSave(item as FavoriteCard)"
						@dblclick="onCardDbClick((item as FavoriteCard).id)"
						@contextmenu="onCardContextMenu($event, (item as FavoriteCard).id)"
					>
						<template #custom-button="{ openUrl }">
							<n-button
								type="warning"
								text
								@click="openUrl((item as FavoriteCard).source.originUrls![0])"
								title="打开卡片对应的来源地址"
								v-ripple
							>
								<template #icon>
									<icon-material-symbols-open-in-new-down-rounded />
								</template>
							</n-button>
						</template>
					</GalleryCard>
				</template>
			</BaseVirtualGrid>
		</div>
		<!-- f 瀑布流布局 -->
		<div v-if="layout === 'waterfall'" style="height: 100%">
			<BaseVirtualMasonry
				style="padding: 10px"
				ref="masonryRef"
				:items="virtualMasonryItem"
				:gap="4"
				:columns="!state.isMobile ? galleryState.column : undefined"
				:breakpoints="state.isMobile ? state.breakpoints : undefined"
				:allow-item-transition="galleryState.allowTransition"
			>
				<template #="{ item, isSkeleton }">
					<GalleryCard
						v-model:data="item.data as FavoriteCard"
						:is-skeleton="isSkeleton"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						:show-to-locate-button="false"
						:show-delete-button="false"
						:show-download-button="
							(item.data as FavoriteCard).source.meta.type !== 'html'
						"
						@change:title="updateCard([item.data as FavoriteCard])"
						@loaded="handleLoaded"
						@download="handleDownloadCard"
						@toggle-favorite="handleToggleFavorite(item.data as FavoriteCard)"
						@save:tags="handleTagsSave(item.data as FavoriteCard)"
						@dblclick="onCardDbClick((item.data as FavoriteCard).id)"
						@contextmenu="
							onCardContextMenu($event, (item.data as FavoriteCard).id)
						"
					>
						<template #custom-button="{ openUrl }">
							<n-button
								type="warning"
								text
								title="打开卡片对应的来源地址"
								v-ripple
								@click="
									openUrl((item.data as FavoriteCard).source.originUrls![0])
								"
							>
								<template #icon>
									<icon-material-symbols-open-in-new-down-rounded />
								</template>
							</n-button>
						</template>
					</GalleryCard>
				</template>
			</BaseVirtualMasonry>
		</div>
	</div>
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
import {
	useContextMenu,
	BaseVirtualMasonry,
	BaseVirtualGrid,
	vRipple,
	type BaseImgReadyInfo,
	type BaseVideoReadyInfo,
	type BaseVirtualMasonryItem,
} from "base-ui";
import GalleryCard from "@/components/utils/gallery-card.vue";
import { FavoriteCard } from "@/models/Card/FavoriteCard";
import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils/common";
import { useClipboard } from "@vueuse/core";
import { Fancybox, configFancybox } from "@/plugin/fancyapps-ui";
import type { CarouselSlide } from "@fancyapps/ui";

import { storeToRefs } from "pinia";
import { useGlobalStore, useCardStore, useFavoriteStore } from "@/stores";
import { GM_openInTab } from "$";
import type { Meta } from "@/models/Card/Meta";
import { useDialog, useNotification } from "@/plugin/naive-ui";

const dialog = useDialog();
const notification = useNotification();

const globalStore = useGlobalStore();
const cardStore = useCardStore();
const favoriteStore = useFavoriteStore();

const { galleryState } = storeToRefs(globalStore);
const { update: updateCard, find: findCard, unfavorite } = favoriteStore;
const { downloadCard, downloadCards } = cardStore;

const props = withDefaults(
	defineProps<{
		cardList: FavoriteCard[];
		layout?: "grid" | "waterfall"; // s 布局模式
		searchKeywords?: string; // s 检索关键词
	}>(),
	{
		cardList: () => [],
		layout: "grid",
		searchKeywords: "",
	},
);

// s 滚动条组件引用
const scrollBarRef = useTemplateRef("scrollBarRef");
const gridRef = useTemplateRef("gridRef");
const masonryRef = useTemplateRef("masonryRef");

// s 组件状态数据
const state = reactive({
	// 列数
	// columns: 5,
	// 是否使用自定义滚动条
	useCustomScrollbar: false,
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
const virtualMasonryItem = computed<Array<BaseVirtualMasonryItem>>(() => {
	return props.cardList.map<BaseVirtualMasonryItem>((c) => {
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
async function handleDownloadCard(id: string) {
	// console.log("下载", id);
	const card = await findCard(id);
	if (!card) return;
	// console.log("找到card", card);
	await downloadCard(card, { dialog });
	// 最后同步跟新数据库数据
	updateCard([card]);
}

async function handleDownloadCards(cards: FavoriteCard[]) {
	await downloadCards(cards, {
		dialog,
		notification,
		initZipName: `RE收藏集 ${new Date().toJSON()}`,
	});
	// 最后同步跟新数据库数据
	updateCard(cards);
}

// f 处理收藏/取消收藏
const handleToggleFavorite = (card: FavoriteCard) => {
	unfavorite([card]);
};

// f 卡片加载成功完成事件( 1.更新cardStore的尺寸范围信息;2.判断卡片是否被收藏 )
const handleLoaded = async (
	id: string,
	info: BaseImgReadyInfo | BaseVideoReadyInfo,
) => {
	// s 仓库找到对应的数据
	const card = await findCard(id);
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
const handleTagsSave = async (card: FavoriteCard) => {
	updateCard([card]);
};

onMounted(() => {
	scrollBarRef.value?.addEventListener("wheel", onMouseWheel, {
		passive: false,
	});

	onUnmounted(() => {
		scrollBarRef.value?.removeEventListener("wheel", onMouseWheel);
	});
});

// f 按住Ctrl滚动鼠标时改变列数
function onMouseWheel(e: WheelEvent) {
	// console.log("改变列数");
	if (e.ctrlKey) {
		e.preventDefault();
		if (e.deltaY < 0) {
			if (galleryState.value.column - 1 > 0) {
				galleryState.value.column--;
			}
		} else {
			if (galleryState.value.column + 1 < 15) {
				galleryState.value.column++;
			}
		}
	}
}

// 定义Fancybox的默认类型
type FancyboxType =
	| "image"
	| "iframe"
	| "youtube"
	| "ajax"
	| "html5video"
	| "inline"
	| false;

function getFancyboxType(metaType: Meta["type"]) {
	let type: FancyboxType = "iframe";
	if (!metaType) return type;
	switch (metaType) {
		case "image":
			type = "image";
			break;
		case "video":
			type = "html5video";
			break;
		case "audio":
		case "zip":
		case "html":
		case "unknown":
		default:
			type = "iframe";
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
				enabled: true,
				display: {
					left: ["open", "cardDownload"],
					middle: ["counter"],
					right: ["rotateCCW", "rotateCW", "toLocate", "thumbs", "close"],
				},
				items: {
					...toolbar.items,
					// f 关闭按钮
					close: {
						tpl: /*html*/ `
							<button class="f-button" title="{{CLOSE}}"><svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24"><path d="M19.286 4.714 4.714 19.286M4.714 4.714l14.572 14.572"></path></svg></button>
						`,
						click() {
							Fancybox.close();
						},
					},
					// f 打开按钮
					open: {
						tpl: /*html*/ `
							<button class="f-button" title="{{NEW_TAB_OPENS}}">
								<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13">
									</path>
								</svg>
							</button>
						`,
						// 点击事件定义
						click: (instance) => {
							const index = instance.getPageIndex();
							const card = props.cardList[index];
							const url = card.source.url;
							if (!url) return;
							GM_openInTab(url, {
								active: true,
								insert: true,
								setParent: true,
							});
						},
					},
					// f 下载按钮
					cardDownload: {
						tpl: /*html*/ `
							<button class="f-button" title="{{DOWNLOAD}}">
								<svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12">
									</path>
								</svg>
							</button>
						`,
						// 点击事件定义
						click: async (instance) => {
							const index = instance.getPageIndex();
							const card = props.cardList[index];
							await cardStore.downloadCard(card, { dialog });
						},
					},
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
		parentEl: scrollBarRef.value ?? undefined,
		startIndex: index,
		hideScrollbar: false,
	});
}

onUnmounted(() => Fancybox.close());
onDeactivated(() => Fancybox.close());

// 使用函数式组件右键菜单
const { showContextMenu } = useContextMenu({
	root: () => scrollBarRef.value,
	fontSize: 14,
});

// f 卡片的右键菜单的回调
async function onCardContextMenu(event: PointerEvent, id: string) {
	const card = props.cardList.find((x) => x.id === id);
	if (!card) return;

	const selectionCard = [...favoriteStore.selectionCardList[cardStore.nowType]];
	if (!selectionCard.includes(card)) selectionCard.push(card);

	const result = await showContextMenu(event, [
		{ label: "预览", command: "preview" },
		{ label: "打开源", command: "openSource" },
		{ label: "打开预览源", command: "openPreview" },
		{ label: "复制源", command: "copySource" },
		{ label: "定位来源", command: "locateSourceAddress" },
		{ label: "取消收藏", command: "unfavorite" },
		{ label: "复制卡片数据", command: "copyCard" },
		{
			label:
				selectionCard.length > 1
					? `下载所选(${selectionCard.length}个)`
					: "下载",
			command: "download",
		},
	] as const);

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
						: JSON.stringify(card, null, 2),
				)
					.then(() => {
						notification.success({
							title: "复制成功",
							content:
								result === "copySource"
									? card.source.url
									: `卡片数据：${card.description.content}`,
							duration: 3000,
						});
					})
					.catch(() => {
						notification.error({
							title: "复制失败",
							duration: 3000,
						});
					});
				break;
			case "unfavorite":
				handleToggleFavorite(card);
				break;
			case "download":
				if (selectionCard.length > 1) {
					handleDownloadCards(selectionCard);
				} else if (selectionCard.length === 1) {
					handleDownloadCard(selectionCard[0].id);
				}
				break;
		}
	}
}
</script>

<style lang="scss" scoped>
/* 修改卡片样式 */
:deep(.base-virtual-grid__wrap),
:deep(.base-virtual-masonry__wrap) {
	.base-card {
		height: 100%;
		overflow: hidden;

		.base-card__content {
			flex-grow: 1;
		}

		.base-img {
			height: 100%;

			& > .base-img__wrapper {
				height: 100%;

				img {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}
			}

			&__error > .base-img__wrapper {
				height: 100%;
				img {
					height: unset;
				}
				.base-img__error-img {
					height: 100%;
					> svg {
						width: 60%;
						height: auto;
					}
				}
			}
		}

		.base-video {
			height: 100%;

			& > .base-video__wrapper {
				height: 100%;

				video {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}
			}

			&__error > .base-video__wrapper {
				height: 100%;
				video {
					height: 0;
				}
				.base-video__error-img {
					height: 100%;
					> svg {
						width: 60%;
						height: auto;
					}
				}
			}
		}
	}
}
</style>
