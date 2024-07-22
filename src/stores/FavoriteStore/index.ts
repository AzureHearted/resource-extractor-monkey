import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";
import Card from "@/stores/CardStore/class/Card";
import type { BaseMeta } from "@/stores/CardStore/interface";
import { isEqualUrl, mixSort } from "@/utils/common";
import type { ExcludeType } from "@/types/tools";
import localforage from "localforage";
import useCardStore from "@/stores/CardStore";

export default defineStore("FavoriteStore", () => {
	const cardStore = useCardStore();
	//s 基础信息
	const info = reactive({
		dbName: "WebImgCollector2",
		storeName: "favorite_card",
	});

	//s localforage仓库对象
	const store = ref<LocalForage>();

	async function open() {
		store.value = localforage.createInstance({
			driver: localforage.INDEXEDDB,
			name: info.dbName,
			storeName: info.storeName,
			description: "收藏的卡片数据",
		});
	}

	//s 过滤关键词
	const filterKeyword = ref("");

	//s 卡片数据列表
	const cardList = ref<Card[]>([]);

	//j 类型->数量映射列表
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

	//j 扩展名->数量映射列表
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

	//j 仓库尺寸范围
	const sizeRange = computed<{
		width: [number, number];
		height: [number, number];
		max: number;
		min: number;
	}>(() => {
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
			}
		);
	});

	//j 仓库中所有标签集合
	const allTags = computed<{ [name: string]: number }>(() => {
		return cardList.value.reduce((all, curr) => {
			const { tags } = curr;
			tags.forEach((tag) => {
				if (Object.keys(all).includes(tag)) {
					all[tag]++;
				} else {
					all[tag] = 1;
				}
			});
			return all;
		}, {} as { [name: string]: number });
	});

	//j 仓库中所有Key值列表
	const keys = computed(() => {
		return cardList.value.map((c) => c.id);
	});

	//j 选中的卡片列表
	const selectedCardList = computed<Card[]>(() => {
		return cardList.value.filter((c) => c.isSelected);
	});

	//t 卡片类型(类型)
	type CardType = ExcludeType<"all" | BaseMeta["type"] | "other", false>;
	//s 当前类型
	const nowType = ref<CardType>("image");

	//s 过滤器
	const filters = reactive({
		type: [] as string[], //类型过滤器
		extension: [] as string[], //扩展名过滤器
		size: {
			width: [250, 2000] as [number, number], //宽度过滤器
			height: [250, 2000] as [number, number], //高度过滤器
			marks: computed(() => {
				const markStyle = reactive({
					"font-size": "10px !important",
					"margin-top": "0 !important",
					bottom: "5px",
				});
				const tempMarks = {
					360: {
						label: "360",
						style: markStyle,
					},
					720: {
						label: "720",
						style: {
							...markStyle,
							display: sizeRange.value.max / 720 < 3 ? "" : "none",
						},
					},
					1080: {
						label: "1080",
						style: {
							...markStyle,
							display: sizeRange.value.max / 1080 < 3 ? "" : "none",
						},
					},
					1920: {
						label: "1920",
						style: {
							...markStyle,
							display: sizeRange.value.max / 1920 < 3 ? "" : "none",
						},
					},
					2560: {
						label: "2560",
						style: {
							...markStyle,
							display: sizeRange.value.max / 2560 < 3 ? "" : "none",
						},
					},
					3840: {
						label: "3840",
						style: markStyle,
					},
					[`${sizeRange.value.max}`]: {
						label: `${sizeRange.value.max}`,
						style: {
							...markStyle,
							display: sizeRange.value.max > 1.8 * 3840 ? "" : "none",
						},
					},
				};
				return tempMarks;
			}),
		},
	});

	//j 类型选项列表
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

	//j 扩展名选项列
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

	//s 排序相关
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
	//s 排序对象
	const sortInfo = reactive({
		method: "#" as (typeof sortOptions)[number]["value"],
		options: sortOptions,
		// (访问器)获取分组数组
		get groups(): sortGroup[] {
			return Object.values(
				this.options.reduce((prev, curr) => {
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
				}, <{ [key: string]: sortGroup }>{})
			);
		},
	});

	//j 初步过滤后的卡片列表
	const filterCardList = computed<{
		[key in CardType]: Card[];
	}>(() => {
		const image = [] as Card[],
			video = [] as Card[],
			audio = [] as Card[],
			zip = [] as Card[],
			html = [] as Card[],
			other = [] as Card[];
		let all = [...cardList.value];

		//s 先排序
		switch (sortInfo.method) {
			case "#":
				all.sort((a, b) =>
					mixSort(
						a.source.originUrls ? a.source.originUrls[0] : "",
						b.source.originUrls ? b.source.originUrls[0] : ""
					)
				);
				break;
			case "name-asc":
				all.sort((a, b) => mixSort(a.description.title, b.description.title));
				break;
			case "name-desc":
				all.sort((a, b) => mixSort(b.description.title, a.description.title));
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
		//s 再过滤
		all = all.filter((c) => {
			// console.log(c.source.meta.width, filters.size.width[1]);
			const { tags } = c;
			const {
				type: sType,
				width: sWidth,
				height: sHeight,
				ext: sExt,
			} = c.source.meta;
			const { title } = c.description;
			const isMatch =
				(title
					.trim()
					.toLocaleLowerCase()
					.includes(filterKeyword.value.trim().toLocaleLowerCase()) ||
					tags.some((tag) => {
						return tag
							.trim()
							.toLocaleLowerCase()
							.includes(filterKeyword.value.trim().toLocaleLowerCase());
					})) &&
				(filters.extension.length > 0
					? filters.extension.includes(String(sExt))
					: true) &&
				(sType === "image" || sType === "video"
					? sWidth >= filters.size.width[0] &&
					  sWidth <= filters.size.width[1] &&
					  sHeight <= filters.size.height[1] &&
					  sHeight >= filters.size.height[0]
					: true);
			if (!isMatch) c.isSelected = false; // 如果不匹配的需要将选中状态设置为false
			if (isMatch) {
				switch (sType) {
					case "image":
						image.push(c);
						break;
					case "video":
						video.push(c);
						break;
					case "audio":
						audio.push(c);
						break;
					case "html":
						html.push(c);
						break;
					case "zip":
						zip.push(c);
						break;
					default:
						other.push(c);
						break;
				}
			}

			return isMatch;
		});

		return { all, image, video, audio, zip, html, other };
	});

	//f 更新匹配状态
	function updateMatchStatus() {
		filterCardList.value.all.forEach((card) => {
			const { tags } = card;
			const { title } = card.description;
			card.isMatch =isKeywordsMatch(title) || isKeywordsMatch(tags)
				
		});
	}

	//f 匹配判断函数
	function isKeywordsMatch(str: string | string[]) {
		if (str instanceof Object) {
			return str.some((tag) => {
				return tag
					.trim()
					.toLocaleLowerCase()
					.includes(filterKeyword.value.trim().toLocaleLowerCase());
			});
		} else {
			return str
				.trim()
				.toLocaleLowerCase()
				.includes(filterKeyword.value.trim().toLocaleLowerCase());
		}
	}

	let process: Promise<any> | false = false;
	//f 刷新仓库数据
	const refreshStore = async () => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => refreshStore());
			return;
		}
		if (process !== false) {
			process.finally(() => refreshStore());
			return;
		}
		// 记录旧卡数据
		const oldList = [...cardList.value];
		process = new Promise<Card[]>((resolve) => {
			const list: Card[] = [];
			store
				.value!.iterate((value: InstanceType<typeof Card>) => {
					//TODO 如果Card类型增添新的内容这里需要同步修改
					const { id, source, preview, description, tags } = value;
					const oldCard = oldList.find((x) => x.id === id);
					list.push(
						new Card({
							id,
							source,
							preview,
							description,
							tags,
							isFavorite: true,
							isMatch: oldCard ? oldCard.isMatch : true,
							isLoaded: oldCard ? oldCard.isLoaded : undefined,
							isSelected: oldCard ? oldCard.isSelected : undefined,
						})
					);
				})
				.then(() => {
					resolve(list);
				})
				.catch(() => {
					resolve([]);
				})
				.finally(() => {
					resolve(list);
				});
		});
		process
			.then((list) => {
				// console.log("获取成功");
				cardList.value = list;
			})
			.catch(() => {
				// console.log("获取失败");
				cardList.value = [];
			})
			.finally(() => {
				process = false;
			});
	};

	//f 清空仓库数据
	const clearStore = async () => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => clearStore());
			return;
		}
		await store.value.clear();
		refreshStore();
	};

	//f 添加卡片
	const addCard = async (cards: Card[]) => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => addCard(cards));
			return;
		}
		// console.log(
		// 	"添加收藏",
		// 	cards,
		// 	cards.map((c) => c.id)
		// );

		for (const card of cards) {
			// 判断卡片是否已经存在
			if (!(await isExist(card))) {
				const rowCard = card.getRowData();
				rowCard.isFavorite = true;
				rowCard.isLoaded = false;
				rowCard.isSelected = false;
				await store.value.setItem(card.id, rowCard);
				console.log("成功收藏卡片", card);
			} else {
				console.log("卡片已存在", card);
			}
		}
		refreshStore();
	};

	//f 更新卡片
	const updateCard = async (cards: Card[]) => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => updateCard(cards));
			return;
		}
		for (const card of cards) {
			// 先查找卡片在仓库的id
			const id = await findCardId(
				(c) =>
					isEqualUrl(c.source.url, card.source.url, { excludeSearch: true }) &&
					isEqualUrl(c.preview.url, card.preview.url, { excludeSearch: true })
			);
			if (!id) continue; //如果id无效就跳过该卡片的更新
			const rowCard = card.getRowData(); // 获取不带ID的未加工数据
			await store.value.setItem(id, rowCard);
			console.log("成功更新卡片", card);
		}
		refreshStore();
	};

	//f 删除卡片
	const deleteCard = async (cards: Card[]) => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => deleteCard(cards));
			return;
		}
		for (const card of cards) {
			// 先查找卡片在仓库的id
			const id = await findCardId(
				(c) =>
					isEqualUrl(c.source.url, card.source.url, { excludeSearch: true }) &&
					isEqualUrl(c.preview.url, card.preview.url, { excludeSearch: true })
			);
			if (!id) continue; //如果id无效就跳过该卡片的取消收藏
			await store.value.removeItem(id);
			console.log("成功从Favorite仓库删除卡片", card);
		}
		refreshStore();
	};

	//f 取消收藏卡片
	const unFavoriteCard = async (cards: Card[]) => {
		//s 判断仓库是否打开？没打开等待打开后重新调用
		if (!store.value) {
			open().then(() => unFavoriteCard(cards));
			return;
		}
		for (const card of cards) {
			// 先查找卡片在仓库的id
			const id = await findCardId(
				(c) =>
					isEqualUrl(c.source.url, card.source.url, { excludeSearch: true }) &&
					isEqualUrl(c.preview.url, card.preview.url, { excludeSearch: true })
			);
			if (!id) continue; //如果id无效就跳过该卡片的取消收藏
			await store.value.removeItem(id);
			console.log("成功取消收藏卡片", card);
		}
		refreshStore();
	};

	//f 查找卡片id
	const findCardId = async (
		/** 匹配函数 */
		matchComparator: (currCard: Card) => boolean,
		refresh: boolean = false
	): Promise<string | undefined> => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		return cardList.value.find((c) => matchComparator(c))?.id;
	};

	//f 查找卡片
	const findCard = async (
		/** 匹配函数 */
		matchComparator: (currCard: Card) => boolean,
		refresh: boolean = false
	): Promise<Card | undefined> => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		return cardList.value.find((c) => matchComparator(c));
	};

	//f 查找卡片(通过数据)
	const findCardByData = async (
		/** 匹配函数 */
		cardData: Card,
		refresh: boolean = false
	): Promise<Card | undefined> => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		return cardList.value.find(
			(c) =>
				isEqualUrl(c.source.url, cardData.source.url, {
					excludeSearch: true,
				}) &&
				isEqualUrl(c.preview.url, cardData.preview.url, { excludeSearch: true })
		);
	};

	//f 查询卡片(通过id)
	const findCardById = async (
		id: string,
		refresh: boolean = false
	): Promise<Card | undefined> => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		// console.log("查找", id);
		return cardList.value.find((c) => c.id === id);
	};

	//f 查询多张卡片(通过id)
	const findCardsById = async (
		ids: string[],
		refresh: boolean = false
	): Promise<Card[]> => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		return cardList.value.filter((c) => ids.includes(c.id)) || [];
	};

	//f 判断卡片是否存在
	/** 若source.url和preview.url相同则视为同一张卡片 */
	const isExist = async (card: Card, refresh: boolean = false) => {
		// 先刷新仓库
		if (refresh) {
			await refreshStore();
		}
		// 判断是否包含卡片
		return cardList.value.some(
			(c) =>
				isEqualUrl(c.source.url, card.source.url, { excludeSearch: true }) &&
				isEqualUrl(c.preview.url, card.preview.url, { excludeSearch: true })
		);
	};

	return {
		store,
		cardList,
		sizeRange,
		nowType,
		filters,
		sortInfo,
		sortOptions,
		typeOptions,
		extensionOptions,
		filterCardList,
		selectedCardList,
		keys,
		allTags,
		filterKeyword,
		refreshStore,
		clearStore,
		addCard,
		updateCard,
		deleteCard,
		unFavoriteCard,
		findCard,
		findCardByData,
		findCardById,
		findCardsById,
		isExist,
		downloadCards: cardStore.downloadCards,
		updateMatchStatus,
	};
});
