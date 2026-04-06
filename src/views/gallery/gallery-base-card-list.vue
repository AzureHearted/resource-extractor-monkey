<template>
	<div ref="scrollBarRef" style="height: 100%" @click="clearSelection">
		<!-- f 普通网格布局 -->
		<div v-if="layout === 'grid'" style="height: 100%">
			<BaseVirtualGrid
				style="padding: 10px"
				ref="gridRef"
				:items="virtualGridItem"
				:gap="4"
				:columns="!state.isMobile ? galleryState.column : undefined"
				:breakpoints="state.isMobile ? state.breakpoints : undefined"
				:allow-item-transition="galleryState.allowTransition"
			>
				<template #="{ item, isSkeleton }">
					<GalleryCard
						v-model:data="item.data"
						:is-selected="cardStore.data.selectedCardIdSet.has(item.id)"
						:is-favorite="cardStore.data.favoriteCardIdSet.has(item.id)"
						:downloading="cardStore.data.downloadingCardIdSet.has(item.id)"
						:is-skeleton="isSkeleton"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						@delete="removeCard([$event])"
						@loaded="handleLoaded"
						@download="handleDownloadCard"
						@toggle-favorite="handleToFavorite(item.id, $event)"
						@toggle-select="handleSelectChange(item.id, $event)"
						@click.stop="handleSelect(item.id, $event)"
						@dblclick.stop="onCardDbClick(item.id)"
						@contextmenu="onCardContextMenu($event, item.id)"
					/>
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
						v-model:data="item.data"
						:is-selected="cardStore.data.selectedCardIdSet.has(item.id)"
						:is-favorite="cardStore.data.favoriteCardIdSet.has(item.id)"
						:downloading="cardStore.data.downloadingCardIdSet.has(item.id)"
						:is-skeleton="isSkeleton"
						:highlight-key="searchKeywords"
						:is-mobile="state.isMobile"
						@delete="removeCard([$event])"
						@loaded="handleLoaded"
						@download="handleDownloadCard"
						@toggle-favorite="handleToFavorite(item.id, $event)"
						@toggle-select="handleSelectChange(item.id, $event)"
						@click.stop="handleSelect(item.id, $event)"
						@dblclick.stop="onCardDbClick(item.id)"
						@contextmenu="onCardContextMenu($event, item.id)"
					/>
				</template>
			</BaseVirtualMasonry>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	computed,
	onMounted,
	onActivated,
	useTemplateRef,
	reactive,
	onUnmounted,
	onDeactivated,
} from "vue";
import {
	useContextMenu,
	BaseVirtualMasonry,
	BaseVirtualGrid,
	type BaseImgReadyInfo,
	type BaseVideoReadyInfo,
	type BaseVirtualMasonryItem,
	type BaseVirtualGridItem,
} from "base-ui";
import GalleryCard from "@/components/utils/gallery-card.vue";
import { Card } from "@/models/Card";
import type { Meta } from "@/models/Card";
import { isEqualUrl, isMobile as judgeIsMobile } from "@/utils";
import { useClipboard } from "@vueuse/core";
import { Fancybox, configFancybox } from "@/plugin/fancyapps-ui";
import type { CarouselSlide } from "@fancyapps/ui";

// ? 导入仓库
import { storeToRefs } from "pinia";
import { useGlobalStore, useCardStore, useFavoriteStore } from "@/stores";
import { GM_openInTab } from "$";
import { useDialog, useNotification } from "@/plugin/naive-ui";

const dialog = useDialog();
const notification = useNotification();

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);
// s 卡片仓库
const cardStore = useCardStore();
const { filterCardList, nowType } = storeToRefs(cardStore);
const { findCard, removeCard, downloadCard, downloadCards } = cardStore;
// s 收藏仓库
const favoriteStore = useFavoriteStore();
const {
	refreshStore: refreshFavoriteStore,
	isExist: isFavorite,
	favorite: toFavoriteCard,
	unfavorite: unFavoriteCard,
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

// j 转为适用于虚拟Grid的数据列表
const virtualGridItem = computed<Array<BaseVirtualGridItem>>(() => {
	return props.cardList.map<BaseVirtualGridItem>((c) => {
		const { id, source } = c;
		const { url: sourceSrc } = source;

		return {
			id,
			src: sourceSrc,
			data: c,
		};
	});
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

// f 卡片加载成功完成事件( 1.更新cardStore的尺寸范围信息;2.判断卡片是否被收藏 )
const handleLoaded = async (
	id: string,
	info: BaseImgReadyInfo | BaseVideoReadyInfo,
) => {
	// s 仓库找到对应的数据
	const card = findCard(id);
	if (!card) return;
	if (cardStore.data.loadedCardIdSet.has(id)) return;
	// 记录已加载的卡片id
	cardStore.data.loadedCardIdSet.add(id);
	// ? 判断卡片是否被收藏
	if (await isFavorite(card)) {
		cardStore.data.favoriteCardIdSet.add(id);
	} else {
		cardStore.data.favoriteCardIdSet.delete(id);
	}
	// s 刷新仓库对应卡片的preview.meta信息
	if (info.meta.valid) {
		card.preview.meta = { ...card.preview.meta, ...info.meta };
		if (isEqualUrl(card.preview.url, card.source.url)) {
			card.source.meta = card.preview.meta;
		}
	}
};

// f 处理下载事件
async function handleDownloadCard(id: string) {
	// console.log("下载", id);
	const card = findCard(id);
	if (!card) return;
	await downloadCard(card, { dialog });
}

// f 处理多卡片下载
async function handleDownloadCards(cards: Card[]) {
	await downloadCards(cards, { dialog, notification });
}

// f 处理收藏切换
const handleToFavorite = async (id: string, isFav: boolean) => {
	const card = findCard(id);
	if (!card) return;
	if (isFav) {
		cardStore.data.favoriteCardIdSet.add(id);
		toFavoriteCard([card]);
	} else {
		cardStore.data.favoriteCardIdSet.delete(id);
		unFavoriteCard([card]);
	}
};

// f 处理选中状态切换
const handleSelectChange = async (id: string, isSelected: boolean) => {
	const card = findCard(id);
	if (!card) return;
	if (isSelected) {
		cardStore.data.selectedCardIdSet.add(id);
	} else {
		cardStore.data.selectedCardIdSet.delete(id);
	}
};

// * 激活时进行比对所有卡片收藏状态
onActivated(() => {
	requestAnimationFrame(async () => {
		// 先属性收藏仓库
		await refreshFavoriteStore();
		const set = new Set(cardStore.data.favoriteCardIdSet);
		// 更新收藏状态
		for (let i = 0; i < props.cardList.length; i++) {
			const card = props.cardList[i];
			if (await isFavorite(card)) {
				set.add(card.id);
			} else {
				set.delete(card.id);
			}
		}
		cardStore.data.favoriteCardIdSet = set;
	});
});

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
							const card = props.cardList[index];
							// 关闭 Fancybox
							Fancybox.close();
							// 定位元素
							if (props.layout === "grid") {
								gridRef.value?.scrollToItem(card.id);
							} else {
								masonryRef.value?.scrollToItem(card.id);
							}
						},
					},
				},
			},
		},
		parentEl: () => scrollBarRef.value ?? undefined,
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

	const isFavorite = cardStore.data.favoriteCardIdSet.has(card.id);

	const selectionCard = [...cardStore.selectionCardList[cardStore.nowType]];
	if (!selectionCard.includes(card)) selectionCard.push(card);

	const result = await showContextMenu(event, [
		{ label: "预览", command: "preview" },
		{
			label: isFavorite ? "取消收藏" : "收藏",
			command: "favorite",
		},
		{ label: "打开源", command: "openSource" },
		{ label: "复制源", command: "copySource" },
		{ label: "打开预览源", command: "openPreview" },
		{ label: "页面中定位", command: "locateInPage" },
		{ label: "复制卡片数据", command: "copyCard" },
		{
			label:
				selectionCard.length > 1
					? `下载所选(${selectionCard.length}个)`
					: "下载",
			command: "download",
		},
		{
			label:
				selectionCard.length > 1
					? `删除所选(${selectionCard.length}个)`
					: "删除",
			command: "remove",
		},
	] as const);

	if (result) {
		switch (result) {
			case "preview":
				openFancybox(id);
				break;
			case "favorite":
				handleToFavorite(card.id, !isFavorite);
				break;
			case "locateInPage":
				const dom = card.source.dom;
				if (!dom) return;
				dom.scrollIntoView({
					behavior: "smooth",
					inline: "center",
					block: "center",
				});
				globalStore.openWindow = false;
				break;
			case "openSource":
				GM_openInTab(card.source.url, {
					active: true,
					insert: true,
					setParent: true,
				});
				break;
			case "openPreview":
				GM_openInTab(card.preview.url, {
					active: true,
					insert: true,
					setParent: true,
				});
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
			case "download":
				if (selectionCard.length > 1) {
					await handleDownloadCards(selectionCard);
				} else if (selectionCard.length === 1) {
					await handleDownloadCard(selectionCard[0].id);
				}
				break;
			case "remove":
				const ids = selectionCard.map((c) => c.id);
				removeCard(ids);
				break;
		}
	}
}

// f 清空所有选中项的选中状态
function clearSelection() {
	cardStore.data.selectedCardIdSet.clear();
}

// f 处理选中
function handleSelect(id: string, e: PointerEvent) {
	if (!e.ctrlKey) {
		cardStore.data.selectedCardIdSet.clear();
	}
	cardStore.data.selectedCardIdSet.add(id);
}

// f 全选
function selectAll() {
	const set = new Set(cardStore.data.selectedCardIdSet);
	filterCardList.value[nowType.value].forEach((c) => set.add(c.id));
	cardStore.data.selectedCardIdSet = set;
}

// 注册和卸载全局事件
onActivated(bindingEvent);
onDeactivated(unbindingEvent);

function bindingEvent() {
	window.addEventListener("keydown", onKeyDown);
}

function unbindingEvent() {
	window.removeEventListener("keydown", onKeyDown);
}

function onKeyDown(e: KeyboardEvent) {
	if (e.ctrlKey && e.key === "a") {
		e.preventDefault();
		// 全选
		selectAll();
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
