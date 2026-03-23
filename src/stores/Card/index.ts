import { defineStore } from "pinia";
import { ref, reactive, computed, watch, h } from "vue";
import type { Ref } from "vue";

// 导入类
import { Card } from "@/models/Card/Card";
import { Meta } from "@/models/Card/Meta";

// 导入工具
import getCard from "./utils/get-cards";
import {
	getNameByUrl,
	legalizationPathString,
	naturalCompare,
	safeDecodeURI,
} from "@/utils/common";
// 导入网络工具请求
import { getBlobByUrlAuto, getSingleFileBlobByUrl } from "@/utils/http";
// 导入打包和保存工具
import JSZip from "jszip";
import { saveAs } from "file-saver"; //* 用于原生浏览器"保存"来实现文件保存

// 导入其他仓库
import { useLoadingStore } from "@/stores/Loading";
import { usePatternStore } from "@/stores/Pattern";
import { useDebounceFn } from "@vueuse/core";
import { cloneDeep } from "lodash";
import { NButton, NFlex, type FormValidationStatus } from "naive-ui";
import { downloadBlob } from "./utils/download-cards";
import type { DialogApiInjection } from "naive-ui/es/dialog/src/DialogProvider";
import type { NotificationApiInjection } from "naive-ui/es/notification/src/NotificationProvider";
import FilenameInputVue from "@/components/utils/filename-input.vue/filename-input.vue.vue";

export const useCardStore = defineStore("CardStore", () => {
	const loadingStore = useLoadingStore();
	const patternStore = usePatternStore();

	// s 数据定义
	const data = reactive({
		/** 卡片列表 */
		cardList: new Array<Card>(),
		/** 被删除的卡片指纹集合 */
		removedCardFingerprintSet: new Set<string>(),
		/** 类型与数量的映射表 */
		typeMap: new Map<string, number>(),
		/** 扩展名与数量的映射表 */
		extensionMap: new Map<string, number>(),
		/** 记录所有链接与Blob的映射表 */
		urlBlobMap: new Map<string, Blob>(),
	});

	// j 卡片指纹集合
	const cardFingerprintSet = computed<Set<string>>(() => {
		const fingerprints = data.cardList.map((c) => c.fingerprint);
		return new Set(fingerprints);
	});

	interface ISizeRange {
		width: [number, number];
		height: [number, number];
		max: number;
		min: number;
	}

	// s 初始尺寸范围
	const initSizeRange: ISizeRange = {
		width: [200, 1024],
		height: [200, 1024],
		min: 0,
		max: 1024,
	};

	// j 仓库尺寸范围
	const sizeRange = computed<ISizeRange>(() => {
		return data.cardList.reduce((prev, curr) => {
			const { width, height } = curr.source.meta;
			if (prev.width[0] > width) prev.width[0] = width;
			if (prev.height[0] > height) prev.height[0] = height;
			if (prev.width[1] < width) prev.width[1] = width;
			if (prev.height[1] < height) prev.height[1] = height;
			prev.min = Math.min(prev.min, prev.width[0], prev.height[0]);
			prev.max = Math.max(prev.max, prev.width[1], prev.height[1]);
			return prev;
		}, cloneDeep(initSizeRange));
	});

	// w 监听仓库尺寸范围变化
	watch(
		() => [sizeRange.value.width[1], sizeRange.value.height[1]],
		([maxW, maxH]) => {
			filters.size.width[1] = maxW;
			filters.size.height[1] = maxH;
		},
	);

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
			width: [250, sizeRange.value.width[1]] as [number, number], //宽度过滤器
			height: [250, sizeRange.value.height[1]] as [number, number], //高度过滤器
		},
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
		[key in CardType]: Card[];
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
			data.cardList,
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

		const image = [] as Card[],
			video = [] as Card[],
			audio = [] as Card[],
			html = [] as Card[],
			zip = [] as Card[],
			unknown = [] as Card[];
		let all = [...data.cardList];

		// s 先排序
		switch (sortInfo.method) {
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
			const { isLoaded, tags } = card;
			const { content: title } = card.description;
			const {
				type: sType,
				width: sWidth,
				height: sHeight,
				ext: sExt,
			} = card.source.meta;
			const { type: pType, width: pWidth, height: pHeight } = card.preview.meta;
			//* 暂时取消最大尺寸限制的过滤
			// s 是否已经被删除
			const isRemoved = data.removedCardFingerprintSet.has(card.fingerprint);
			// s 是否扩展名是否匹配
			const isExtensionMatch =
				filters.extension.length > 0
					? filters.extension.includes(String(sExt))
					: true;
			// s 判断是否是图片或者视频，如果是并且已经加载则判断是否符合尺寸过滤器
			const isSourceSizeMatch =
				(sType === "image" || sType === "video") && isLoaded
					? sWidth >= filters.size.width[0] &&
						// sWidth <= filters.size.width[1] &&
						// sHeight <= filters.size.height[1] &&
						sHeight >= filters.size.height[0]
					: true;
			const isPreviewSizeMatch =
				(pType === "image" || pType === "video") && isLoaded
					? pWidth >= filters.size.width[0] &&
						// pWidth <= filters.size.width[1] &&
						// pHeight <= filters.size.height[1] &&
						pHeight >= filters.size.height[0]
					: true;
			const isMatchKeyWords =
				isKeywordsMatch(title, keywords) || isKeywordsMatch(tags, keywords);

			// s 判断是否所有条件都匹配
			const isMatch =
				!isRemoved &&
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
			zip,
			audio,
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

	// j 类型列表
	const typeOptions = computed(() => {
		const typeNameMap = new Map<string, string>([
			["image", "图片"],
			["video", "视频"],
			["audio", "音频"],
			["html", "网页"],
		]);
		const options = [...data.typeMap.keys()]
			.sort((a, b) => {
				// 降序排序
				return data.typeMap.get(b)! - data.typeMap.get(a)!;
			})
			.map((x) => {
				const label = typeNameMap.get(x);
				return {
					value: x,
					label: label ? label : x,
					count: data.typeMap.get(x),
				};
			});
		return options;
	});

	// j 扩展名列表
	const extensionOptions = computed(() => {
		return [...data.extensionMap.keys()]
			.sort((a, b) => {
				// 降序排序
				return data.extensionMap.get(b)! - data.extensionMap.get(a)!;
			})
			.map((x) => {
				return {
					value: x,
					label: x,
					count: data.extensionMap.get(x),
				};
			});
	});

	// f 获取页面资源
	async function getPageCard(options: {
		stopFlag?: Ref<boolean>;
		notification: NotificationApiInjection;
	}) {
		const { notification, stopFlag } = options;

		const patternId = patternStore.used.id;
		const patternNow =
			patternStore.findPattern(patternId) || patternStore.list[0];
		console.log("当前方案", patternNow);

		if (!patternNow.rules.length) {
			notification.warning({
				title: "注意",
				content: "该方案没有包含任何规则！(请为方案添加规则后再进行此操作)",
				duration: 5000,
			});
			return;
		}

		// 记录新卡片数据
		let newCardList: Card[] = [];
		const newCardFingerprintSet = new Set<string>();
		let totalNewCardCount = 0;

		loadingStore.start();

		// s 依次执行每个规则
		for (let i = 0; i < patternNow.rules.length; i++) {
			if (stopFlag?.value) break;
			const rule = patternNow.rules[i];
			// 跳过未启用的规则
			if (!rule.enable) continue;
			await getCard(
				// 规则配置
				rule,
				// 选项配置
				{
					excludeParentSelectors: [".resource-extractor"],
					// * 当获取到所有基准dom时的回调
					onAllDOMGet: async (doms) => {
						// console.log("匹配到的DOM", doms);
						loadingStore.update(0, doms.length);
						return doms;
					},
					// * 当获得卡片时的回调
					onCardGet: async (card, index, _dom, addCard, stop) => {
						// 更新进度条
						loadingStore.update(index + 1);
						const sourceMeta = card.source.meta;

						if (
							card.source.url.trim() === "" ||
							newCardFingerprintSet.has(card.fingerprint) ||
							cardFingerprintSet.value.has(card.fingerprint) ||
							data.removedCardFingerprintSet.has(card.fingerprint)
						)
							return;

						// 记录指纹
						newCardFingerprintSet.add(card.fingerprint);

						// 更新类型记录
						if (sourceMeta.type) {
							if (data.typeMap.has(sourceMeta.type)) {
								// 如果已经存在了就++
								data.typeMap.set(
									sourceMeta.type,
									data.typeMap.get(sourceMeta.type)! + 1,
								);
							} else {
								data.typeMap.set(sourceMeta.type, 1);
							}
						}

						// 更新扩展名记录
						if (sourceMeta.ext) {
							if (data.extensionMap.has(sourceMeta.ext)) {
								// 如果已经存在了就++
								data.extensionMap.set(
									sourceMeta.ext,
									data.extensionMap.get(sourceMeta.ext)! + 1,
								);
							} else {
								data.extensionMap.set(sourceMeta.ext, 1);
							}
						}

						// 如果blob存在则记录到 url 和 blob 的 Map 对象中 (减少后续不必要的请求)
						if (card.source.blob) {
							data.urlBlobMap.set(card.source.url, card.source.blob);
						}

						// 记录卡片
						newCardList[index] = card;
						totalNewCardCount++;

						await addCard(); // 执行回调函数

						if (stopFlag?.value) {
							stop();
							return;
						}
					},
					// * 当前规则匹配结束后的回调
					onFinished() {
						const validNewCardList = newCardList.filter((x) => x != null);
						data.cardList.push(...validNewCardList);
						newCardList = [];
					},
				},
			);
		}

		if (!totalNewCardCount) {
			notification.warning({
				title: "注意",
				content: "该方案未匹配到任何有效结果",
				duration: 5000,
			});
		}

		loadingStore.end();
	}

	// f 重置过滤器
	function resetFilters() {
		filters.size.width = [initSizeRange.width[0], initSizeRange.width[1]];
		filters.size.height = [initSizeRange.height[0], initSizeRange.height[1]];
		filters.extension = [];
		filters.type = [];
	}

	// f 清空卡片
	async function clearCardList() {
		data.typeMap.clear(); // 清空类型映射表
		data.extensionMap.clear(); // 清空扩展名映射表
		data.urlBlobMap.clear(); // 清空url和blob的Map对象
		data.cardList = []; // 清空卡片列表
		data.removedCardFingerprintSet.clear();
	}

	// f 移除卡片
	function removeCard(ids: string[]) {
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const index = data.cardList.findIndex((card) => card.id === id);
			const [card] = data.cardList.splice(index, 1);
			if (card == null) return;
			data.removedCardFingerprintSet.add(card.fingerprint);
		}
	}

	// f 查询卡片
	function findCard(id: string): Card | null {
		return data.cardList.find((c) => c.id === id) ?? null;
	}

	// f 查询多张卡片
	function findCards(ids: string[]): Card[] {
		return data.cardList.filter((c) => ids.includes(c.id)) || [];
	}

	// f 下载多个卡片并打包
	async function downloadCards(
		cards: Card[],
		options: {
			dialog: DialogApiInjection;
			notification: NotificationApiInjection;
			/** 初始压缩包名称 */
			initZipName?: string;
		},
	) {
		const { dialog, notification } = options;
		console.log("下载卡片", cards);

		notification.info({
			title: "提示",
			content: "开始下载……",
			duration: 2000,
		});

		loadingStore.start(cards.length); // 开启进度条

		// 大于1的时候进行打包
		// 创建zip容器
		const zipContainer = new JSZip();

		// 计算补零数
		const paddingZeroCount = String(cards.length).length;

		await downloadBlob(cards, {
			OnCardDownloadSuccess(card, index, completed) {
				let name = card.description.content.trim();
				if (!name) {
					name = getNameByUrl(card.source.url);
				}
				if (card.source.meta.type !== "html") {
					name = name + `.${card.source.meta.ext}`;
				}
				// 将blob存入zip容器
				zipContainer.file(
					`${String(index).padStart(paddingZeroCount, "0")} - ${name}`,
					card.source.blob!,
				);
				// 更新进度
				loadingStore.update(completed);
			},
			async OnAllCardDownload() {
				notification.info({
					title: "提示",
					content: "下载完成！正在打包……",
					duration: 2000,
				});

				// 重置进度
				loadingStore.update(0, zipContainer.length);

				// s 生成压缩包
				const zip: Blob = await zipContainer.generateAsync(
					{
						type: "blob",
						compression: "DEFLATE",
					},
					// 压缩的进度回调
					(metadata) => {
						loadingStore.updatePercent(metadata.percent * 0.01);
					},
				);

				// 下载压缩包
				// 获取标题
				let initZipName: string;

				if (options.initZipName != null && options.initZipName.trim() != "") {
					initZipName = options.initZipName.trim();
				} else {
					const titles = [
						document.title,
						...[...document.querySelectorAll("h1")].map((dom) => dom.innerText),
						...[...document.querySelectorAll("title")].map(
							(dom) => dom.innerText,
						),
					]
						.filter((title) => !!title && !!title.trim().length)
						.map((title) => title.replace("\\", "-").replace(",", "_"));

					if (titles.length) {
						initZipName = titles[0]; // 如果标题获取成功就使用首个标题
					} else {
						initZipName = getNameByUrl(safeDecodeURI(location.href)); // 如果标题获取失败就直接使用href提取标题
					}
				}

				loadingStore.end(); // 结束进度条

				// 下载完成后让用户进行文件名确认
				let res = await new Promise<{ value: string; isOk: boolean }>(
					(resolve) => {
						const text = ref(legalizationPathString(initZipName));
						const status = ref<FormValidationStatus>("success");
						const allowPositive = computed(() => status.value !== "success");

						const d = dialog.success({
							title: "文件下载",
							// 内容自定义
							content() {
								return h(FilenameInputVue, {
									name: text.value,
									label: "保存文件名：",
									placeholder: "输入要保存的文件名称",
									clearable: true,
									"onUpdate:name": (val) => {
										text.value = val;
									},
									"onUpdata:status": (val) => {
										status.value = val;
									},
								});
							},
							draggable: true,
							closeOnEsc: true,
							maskClosable: false,
							// 操作按钮自定义
							action() {
								return h(
									NFlex,
									{ size: 4 },
									{
										default: () => {
											return [
												h(
													NButton,
													{
														type: "default",
														style: "margin-right:12px",
														onClick() {
															resolve({ value: initZipName, isOk: false });
															d.destroy();
														},
													},
													{ default: () => "取消" },
												),
												h(
													NButton,
													{
														type: "primary",
														disabled: allowPositive.value,
														onClick() {
															resolve({ value: text.value, isOk: true });
															d.destroy();
														},
													},
													{ default: () => "确认" },
												),
											];
										},
									},
								);
							},
						});
					},
				);

				if (!res.isOk) return;

				let zipName = res.value;
				zipName = legalizationPathString(zipName);
				console.log("保存压缩包名称:", zipName);
				saveAs(zip, `${zipName}.zip`);

				notification.success({
					title: "打包成功",
					content: "开始下载压缩包……",
					duration: 2000,
				});
			},
		});
	}

	/**
	 * 下载卡片
	 * @param card 卡片
	 * @param options 配置
	 * @returns
	 */
	async function downloadCard(
		card: Card,
		options: {
			dialog: DialogApiInjection;
		},
	) {
		console.log("准备下载卡片", card);

		const { dialog } = options;

		card.downloading = true;
		const { type } = card.source.meta;
		// 等于1的时候不打包，直接下载
		if (
			type === "image" ||
			type === "video" ||
			type === "audio" ||
			type === "zip"
		) {
			if (!card.source.blob) {
				// 如果没有blob先获取
				const blob = await getBlobByUrlAuto(card.source.url);
				if (blob) {
					card.source.blob = blob;
				}
			}
		} else if (type === "html") {
			const blob = await getSingleFileBlobByUrl(card.source.url);
			console.log("网页下载结果：", blob);
			card.source.blob = blob;
		}

		let initName = card.description.content.trim();
		if (!initName) {
			initName = getNameByUrl(card.source.url);
		}
		card.downloading = false;

		// 下载完成后让用户进行文件名确认
		let res = await new Promise<{ value: string; isOk: boolean }>((resolve) => {
			const text = ref(legalizationPathString(initName));
			const status = ref<FormValidationStatus>("success");
			const allowPositive = computed(() => status.value !== "success");

			const d = dialog.success({
				title: "文件下载",
				// 内容自定义
				content() {
					return h(FilenameInputVue, {
						name: text.value,
						label: "保存文件名：",
						placeholder: "输入要保存的文件名称",
						clearable: true,
						"onUpdate:name": (val) => {
							text.value = val;
						},
						"onUpdata:status": (val) => {
							status.value = val;
						},
					});
				},
				draggable: true,
				closeOnEsc: true,
				maskClosable: false,
				// 操作按钮自定义
				action() {
					return h(
						NFlex,
						{ size: 4 },
						{
							default: () => {
								return [
									h(
										NButton,
										{
											type: "default",
											style: "margin-right:12px",
											onClick() {
												resolve({ value: initName, isOk: false });
												d.destroy();
											},
										},
										{ default: () => "取消" },
									),
									h(
										NButton,
										{
											type: "primary",
											disabled: allowPositive.value,
											onClick() {
												resolve({ value: text.value, isOk: true });
												d.destroy();
											},
										},
										{ default: () => "确认" },
									),
								];
							},
						},
					);
				},
			});
		});

		if (!res.isOk) return;

		let name = res.value;

		name = legalizationPathString(name);

		// 添加后缀名
		name =
			card.source.meta.type !== "html"
				? name + `.${card.source.meta.ext}`
				: name + ".html";

		// 保存
		saveAs(card.source.blob!, name);
	}

	return {
		data,
		initSizeRange,
		sizeRange,
		sort: sortInfo,
		filters,
		nowType,
		selectionCardList,
		filterCardList,
		typeOptions,
		extensionOptions,
		getPageCard,
		clearCardList,
		removeCard,
		findCard,
		findCards,
		downloadCards,
		downloadCard,
		resetFilters,
	};
});
