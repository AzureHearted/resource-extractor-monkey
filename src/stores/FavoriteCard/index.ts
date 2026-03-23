import { defineStore } from "pinia";
import { computed, onActivated, reactive, ref, watch } from "vue";
import { FavoriteCard } from "@/models/Card/FavoriteCard";
import { naturalCompare } from "@/utils/common";
import localforage from "localforage";
import { useCardStore } from "@/stores";
import { useDebounceFn } from "@vueuse/core";
import { useListIndexedDB } from "@/hooks/useIndexedDB";
import type { Meta } from "@/models/Card/Meta";
import type { Card } from "@/models/Card/Card";

export default defineStore("FavoriteStore", () => {
	const cardStore = useCardStore();
	// s 基础信息
	const info = reactive({
		dbName: "WebImgCollector2", // TODO 暂时不改名后续完善迁移逻辑
		storeName: "favorite_card",
	});

	const favoriteDBStore = useListIndexedDB<ReturnType<FavoriteCard["toRaw"]>>(
		info.storeName,
		{
			name: info.dbName,
			driver: localforage.INDEXEDDB,
			description: "收藏的卡片数据",
		},
	);

	// s 卡片数据列表
	const cardList = ref<FavoriteCard[]>([]);

	// j 类型->数量映射列表
	const typeMap = computed<Map<string, number>>(() => {
		return cardList.value.reduce((prev, curr) => {
			const currType = curr.source.meta.type;
			if (!currType) return prev;
			if (prev.has(currType)) {
				prev.set(currType, prev.get(currType)! + 1);
			} else {
				prev.set(currType, 1);
			}
			return prev;
		}, new Map<string, number>());
	});

	// j 扩展名->数量映射列表
	const extensionMap = computed<Map<string, number>>(() => {
		return cardList.value.reduce((prev, curr) => {
			const currExt = curr.source.meta.ext;
			if (!currExt) return prev;
			if (prev.has(currExt)) {
				prev.set(currExt, prev.get(currExt)! + 1);
			} else {
				prev.set(currExt, 1);
			}
			return prev;
		}, new Map<string, number>());
	});

	interface ISizeRange {
		width: [number, number];
		height: [number, number];
		max: number;
		min: number;
	}

	// j 仓库尺寸范围
	const sizeRange = computed<ISizeRange>(() => {
		return cardList.value.reduce(
			(prev, curr) => {
				const { width, height } = curr.source.meta;
				if (prev.width[0] > width) prev.width[0] = width;
				if (prev.height[0] > height) prev.height[0] = height;
				if (prev.width[1] < width) prev.width[1] = width;
				if (prev.height[1] < height) prev.height[1] = height;
				prev.min = Math.min(prev.min, prev.width[0], prev.height[0]);
				prev.max = Math.max(prev.max, prev.width[1], prev.height[1]);
				return prev;
			},
			{
				width: [0, 2000],
				height: [0, 2000],
				min: 0,
				max: 2000,
			},
		);
	});

	// j 仓库中所有标签集合
	const allTags = computed<{ [name: string]: number }>(() => {
		return cardList.value.reduce(
			(all, curr) => {
				const { tags } = curr;
				tags.forEach((tag) => {
					if (Object.keys(all).includes(tag)) {
						all[tag]++;
					} else {
						all[tag] = 1;
					}
				});
				return all;
			},
			{} as { [name: string]: number },
		);
	});

	// j 仓库中所有Key值列表
	const keys = computed(() => {
		return cardList.value.map((c) => c.id);
	});

	// j 选中的卡片
	const selectionCardList = computed<CardGroup>(() => {
		return {
			all: filterCardList.value.all.filter((x) => x.isSelected),
			image: filterCardList.value.image.filter((x) => x.isSelected),
			video: filterCardList.value.video.filter((x) => x.isSelected),
			audio: filterCardList.value.audio.filter((x) => x.isSelected),
			zip: filterCardList.value.zip.filter((x) => x.isSelected),
			html: filterCardList.value.html.filter((x) => x.isSelected),
			unknown: filterCardList.value.unknown.filter((x) => x.isSelected),
		};
	});

	// t 卡片类型(类型)
	type CardType = "all" | Meta["type"];

	// s 当前类型
	const nowType = ref<CardType>("image");

	// s 过滤器
	const filters = reactive({
		keyword: "",
		type: [] as string[], //类型过滤器
		extension: [] as string[], //扩展名过滤器
		size: {
			width: [250, 2000] as [number, number], //宽度过滤器
			height: [250, 2000] as [number, number], //高度过滤器
		},
	});

	// j 类型选项列表
	const typeOptions = computed(() => {
		const typeNameMap = new Map<string, string>([
			["image", "图片"],
			["video", "视频"],
			["audio", "音频"],
			["html", "网页"],
		]);
		const options = [...typeMap.value.keys()]
			.sort((a, b) => {
				// 降序排序
				return typeMap.value.get(b)! - typeMap.value.get(a)!;
			})
			.map((x) => {
				const label = typeNameMap.get(x);
				return {
					value: x,
					label: label ? label : x,
					count: typeMap.value.get(x),
				};
			});
		return options;
	});

	// j 扩展名选项列
	const extensionOptions = computed(() => {
		return [...extensionMap.value.keys()]
			.sort((a, b) => {
				// 降序排序
				return extensionMap.value.get(b)! - extensionMap.value.get(a)!;
			})
			.map((x) => {
				return {
					value: x,
					label: x,
					count: extensionMap.value.get(x),
				};
			});
	});

	// s 排序相关
	const sortOptions = [
		{ value: "#", label: "默认排序", group: "#" },
		{ value: "name-asc", label: "名称-升序", group: "名称" },
		{ value: "name-desc", label: "名称-降序", group: "名称" },
		{ value: "width-asc", label: "宽度-升序", group: "尺寸" },
		{ value: "width-desc", label: "宽度-降序", group: "尺寸" },
		{ value: "height-asc", label: "高度-升序", group: "尺寸" },
		{ value: "height-desc", label: "高度-降序", group: "尺寸" },
	] as const; // 这里断言数组中的所有属性值为只读(为了能正确进行类型提示)
	type sortGroup = {
		type: "group";
		label: string;
		key: string;
		children: ((typeof sortOptions)[number] & { key: string })[];
	};
	// s 排序对象
	const sortInfo = reactive({
		method: "#" as (typeof sortOptions)[number]["value"],
		options: sortOptions,
		// (访问器)获取分组数组
		get groups(): sortGroup[] {
			return Object.values(
				this.options.reduce(
					(prev, curr) => {
						if (!prev[curr.group]) {
							prev[curr.group] = {
								type: "group",
								key: curr.group,
								label: curr.group,
								children: [],
							};
						}
						prev[curr.group].children.push({
							...curr,
							key: curr.value,
						});
						return prev;
					},
					<{ [key: string]: sortGroup }>{},
				),
			);
		},
	});

	// t 卡片分组类型
	type CardGroup = {
		[key in CardType]: FavoriteCard[];
	};

	// s 过滤器后的卡片列表
	const filterCardList = ref<CardGroup>({
		all: [],
		image: [],
		video: [],
		zip: [],
		audio: [],
		html: [],
		unknown: [],
	});

	watch(
		() => [
			filters.keyword,
			filters.size.width,
			filters.size.height,
			filters.extension,
			sortInfo.method,
			cardList,
		],
		() => {
			debounceUpdateFilterResult();
		},
		{ deep: true },
	);

	const debounceUpdateFilterResult = useDebounceFn(updateFilterResult, 300);

	// f 更新过滤结果
	function updateFilterResult() {
		const keywords = filters.keyword.trim().toLocaleLowerCase();

		const image = [] as FavoriteCard[],
			video = [] as FavoriteCard[],
			audio = [] as FavoriteCard[],
			zip = [] as FavoriteCard[],
			html = [] as FavoriteCard[],
			unknown = [] as FavoriteCard[];
		let all = [...cardList.value];

		// s 先排序
		switch (sortInfo.method) {
			case "#":
				all.sort((a, b) => b.timestamp - a.timestamp);
				break;
			case "name-asc":
				all.sort((a, b) =>
					naturalCompare(a.description.content, b.description.content),
				);
				break;
			case "name-desc":
				all.sort((a, b) =>
					naturalCompare(b.description.content, a.description.content),
				);
				break;
			case "width-asc":
				all.sort((a, b) => a.source.meta.width - b.source.meta.width);
				break;
			case "width-desc":
				all.sort((a, b) => b.source.meta.width - a.source.meta.width);
				break;
			case "height-asc":
				all.sort((a, b) => a.source.meta.height - b.source.meta.height);
				break;
			case "height-desc":
				all.sort((a, b) => b.source.meta.height - a.source.meta.height);
				break;
		}
		// s 再过滤
		all = all.filter((card) => {
			const { tags } = card;
			const { content: title } = card.description;
			const {
				type: sType,
				width: sWidth,
				height: sHeight,
				ext: sExt,
			} = card.source.meta;
			const { type: pType, width: pWidth, height: pHeight } = card.preview.meta;

			// s 是否扩展名是否匹配
			const isExtensionMatch =
				filters.extension.length > 0
					? filters.extension.includes(String(sExt))
					: true;
			// s 判断是否是图片或者视频，如果是并且已经加载则判断是否符合尺寸过滤器
			const isSourceSizeMatch =
				sType === "image" || sType === "video"
					? sWidth >= filters.size.width[0] &&
						sWidth <= filters.size.width[1] &&
						sHeight <= filters.size.height[1] &&
						sHeight >= filters.size.height[0]
					: true;
			const isPreviewSizeMatch =
				pType === "image" || pType === "video"
					? pWidth >= filters.size.width[0] &&
						pWidth <= filters.size.width[1] &&
						pHeight <= filters.size.height[1] &&
						pHeight >= filters.size.height[0]
					: true;
			const isMatchKeyWords =
				isKeywordsMatch(title, keywords) || isKeywordsMatch(tags, keywords);

			// s 判断是否所有条件都匹配
			const isMatch =
				isExtensionMatch &&
				(isSourceSizeMatch || isPreviewSizeMatch) &&
				isMatchKeyWords;
			if (!isMatch) card.isSelected = false; // 如果不匹配的需要将选中状态设置为false
			if (isMatch) {
				switch (sType) {
					case "image":
						image.push(card);
						break;
					case "video":
						video.push(card);
						break;
					case "audio":
						audio.push(card);
						break;
					case "html":
						html.push(card);
						break;
					case "zip":
						zip.push(card);
						break;
					default:
						unknown.push(card);
						break;
				}
			}

			return isMatch;
		});

		filterCardList.value = {
			all,
			image,
			video,
			audio,
			zip,
			html,
			unknown,
		};
	}

	// f 匹配判断函数
	function isKeywordsMatch(str: string | string[], keywords: string) {
		if (str instanceof Object) {
			return str.some((tag) => {
				return tag.trim().toLocaleLowerCase().includes(keywords);
			});
		} else {
			return str.trim().toLocaleLowerCase().includes(keywords);
		}
	}

	// ? 被激活时也刷新
	onActivated(() => {
		refreshStore();
	});

	// f 刷新仓库数据
	async function refreshStore() {
		// console.log("刷新收藏数据库");
		await upgradeOldDBData();
		// 记录旧卡数据
		const oldList = [...cardList.value];
		const list: FavoriteCard[] = [];
		await favoriteDBStore.iterate((value) => {
			//TODO 如果Card类型增添新的内容这里需要同步修改
			const oldCard = oldList.find((x) => x.id === value.fingerprint);
			const favCard = new FavoriteCard({
				...value,
				id: value.fingerprint,
				isFavorite: true,
				isLoaded: oldCard ? oldCard.isLoaded : undefined,
				isSelected: oldCard ? oldCard.isSelected : undefined,
			});

			fixCardInfo(favCard);

			list.push(favCard);
		});

		cardList.value = list;
	}

	// f 升级旧DB数据
	async function upgradeOldDBData() {
		await favoriteDBStore.iterate((value, key) => {
			// 跳过新数据
			if (value.fingerprint != null) return;
			// 升级旧数据
			const favCard = new FavoriteCard(value);

			fixCardInfo(favCard, false); // 这里不更新数据库

			favoriteDBStore.set(favCard.fingerprint, favCard.toJSON());
			// 删除旧数据
			favoriteDBStore.remove(key);
		});
	}

	// f 修复卡片信息 (通常用于修复旧数据属性变更的情况)
	function fixCardInfo(card: FavoriteCard, updateDBStore = true) {
		const maybeTitle = (card.description as any)?.title?.trim();
		if (
			card.description.content.trim() == "" &&
			maybeTitle != null &&
			maybeTitle != ""
		) {
			card.description.content = (card.description as any).title;
			// 更新数据库对应数据
			if (updateDBStore) {
				favoriteDBStore.set(card.fingerprint, card.toJSON());
			}
		}
	}

	// f 清空仓库数据
	async function clearStore() {
		await favoriteDBStore.clear();
		cardList.value = [];
	}

	// f 查找卡片id
	async function find(id: string) {
		const item = cardList.value.find((c) => c.id === id);
		if (item == null) return null;
		return item as FavoriteCard;
	}

	// f 收藏卡片
	function favoriteCard(card: FavoriteCard) {
		cardList.value.push(card);
	}

	// f 添加卡片 (DB)
	async function favorite(cards: Card[]) {
		for (const card of cards) {
			// 判断卡片是否已经存在
			if (!(await isExist(card))) {
				const rawCard = card.toJSON();
				const favCard = new FavoriteCard(rawCard);
				await favoriteDBStore.set(favCard.fingerprint, favCard.toJSON());
				favoriteCard(favCard);
				// console.log("成功收藏卡片", card);
			} else {
				// console.log("卡片已存在", card);
			}
		}
	}

	// f 更新卡片
	function updateCard(id: string, card: FavoriteCard) {
		const index = cardList.value.findIndex((c) => c.id === id);
		if (index === -1) return;
		// cardList.value.splice(index, 1);
		cardList.value[index] = card;
	}

	// f 更新卡片 (DB)
	async function update(cards: Card[]) {
		for (const card of cards) {
			// 先查找卡片在仓库的id
			// 如果找不到卡片就跳过
			const favCard = await find(card.fingerprint);
			if (favCard == null) continue;
			const newFavCard = new FavoriteCard({
				...favCard,
				...card.toJSON(),
				timestamp: favCard.timestamp,
			});
			await favoriteDBStore.set(newFavCard.fingerprint, newFavCard.toJSON());
			// 同步更新卡片数据
			updateCard(newFavCard.fingerprint, newFavCard);
		}
	}

	// f 删除卡片
	function deleteCard(id: string) {
		const index = cardList.value.findIndex((c) => c.id === id);
		if (index === -1) return;
		cardList.value.splice(index, 1);
	}

	// f 取消收藏卡片 (DB)
	async function unfavorite(cards: Card[]) {
		for (const card of cards) {
			// 先查找卡片在仓库的id
			// 如果找不到卡片就跳过
			const favCard = await find(card.fingerprint);
			if (favCard == null) continue;
			await favoriteDBStore.remove(favCard.fingerprint);
			// 同步更新卡片数据
			deleteCard(favCard.fingerprint);
		}
	}

	// f 判断卡片是否存在 (DB)
	async function isExist(card: Card) {
		// 尝试从收藏DB中获取
		return (await favoriteDBStore.get(card.fingerprint)) != null;
	}

	return {
		cardList,
		sizeRange,
		nowType,
		filters,
		sortInfo,
		sortOptions,
		typeOptions,
		extensionOptions,
		filterCardList,
		selectionCardList,
		keys,
		allTags,
		refreshStore,
		clearStore,
		find,
		favorite,
		unfavorite,
		update,
		isExist,
		downloadCards: cardStore.downloadCards,
		downloadCard: cardStore.downloadCard,
	};
});
