import { defineStore } from "pinia";
import { ref, reactive, computed, watch, nextTick } from "vue";
import { ElNotification, ElMessageBox } from "@/plugin/element-plus";
import type { BaseMeta } from "@/stores/CardStore/interface";
import type { ExcludeType } from "@/types/tools";

// 导入类
import Card from "./class/Card";
import { TaskQueue } from "@/utils/taskQueue"; // 任务队列
// 导入工具
import getCard from "./utils/get-cards";
import {
	getBlobType,
	getExtByBlob,
	getNameByUrl,
	legalizationPathString,
	naturalCompare,
	safeDecodeURI,
} from "@/utils/common";
// 导入网络工具请求
import { getBlobByUrlAuto } from "@/utils/http";
// 导入打包和保存工具
import JSZip from "jszip";
import { saveAs } from "file-saver"; //* 用于原生浏览器"保存"来实现文件保存

// 导入其他仓库
import useLoadingStore from "@/stores/LoadingStore";
import usePatternStore from "@/stores/PatternStore";

export default defineStore("CardStore", () => {
	const loadingStore = useLoadingStore();
	const patternStore = usePatternStore();

	// s 数据定义
	const data = reactive({
		// 所有卡片列表
		cardList: [] as Card[],
		// 所有匹配到的链接集合
		urlSet: new Set() as Set<string>,
		// 所有匹配到的dom集合
		domSet: new Set() as Set<HTMLElement>,
		// 所有被排除的卡片集合
		excludeIdSet: new Set() as Set<Card["id"]>,
		// 类型与数量的映射表
		typeMap: new Map<string, number>(),
		// 扩展名与数量的映射表
		extensionMap: new Map<string, number>(),
		// 记录所有链接与Blob的映射表
		urlBlobMap: new Map<string, Blob>(),
	});

	//* 设置初始类型
	data.typeMap.set("image", 0);
	data.typeMap.set("html", 0);

	// j 仓库尺寸范围
	const sizeRange = computed<{
		width: [number, number];
		height: [number, number];
		max: number;
		min: number;
	}>(() => {
		return data.cardList.reduce(
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

	// w 监听仓库尺寸范围变化
	watch(
		[() => sizeRange.value.width[1], () => sizeRange.value.height[1]],
		([maxW, maxH]) => {
			// console.log("仓库最大尺寸变化");
			filters.size.width[1] = maxW; // 更新过滤器最大宽度。
			filters.size.height[1] = maxH; // 更新过滤器最大宽度。
		}
	);

	// t 卡片类型(类型)
	type CardType = ExcludeType<"all" | BaseMeta["type"], false>;
	// s 当前类型
	const nowType = ref<CardType>("image");
	// s 过滤器
	const filters = reactive({
		keyword: "",
		size: {
			width: [250, sizeRange.value.width[1]] as [number, number], //宽度过滤器
			height: [250, sizeRange.value.height[1]] as [number, number], //高度过滤器
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
		type: [] as string[], //类型过滤器
		extension: [] as string[], //扩展名过滤器
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
	const sort = reactive({
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

	// j 过滤后的卡片
	const filterCardList = computed<{
		[key in CardType]: Card[];
	}>(() => {
		const keywords = filters.keyword.trim().toLocaleLowerCase();

		const image = [] as Card[],
			video = [] as Card[],
			audio = [] as Card[],
			html = [] as Card[],
			zip = [] as Card[],
			other = [] as Card[];
		let all = [...data.cardList];

		// s 先排序
		switch (sort.method) {
			case "name-asc":
				all.sort((a, b) =>
					naturalCompare(a.description.title, b.description.title)
				);
				break;
			case "name-desc":
				all.sort((a, b) =>
					naturalCompare(b.description.title, a.description.title)
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
			const { id, isLoaded, tags } = card;
			const { title } = card.description;
			const {
				type: sType,
				width: sWidth,
				height: sHeight,
				ext: sExt,
			} = card.source.meta;
			//* 暂时取消最大尺寸限制的过滤
			// s 是否未被排除
			const isNotExclude = !data.excludeIdSet.has(id);
			// s 是否扩展名是否匹配
			const isExtensionMatch =
				filters.extension.length > 0
					? filters.extension.includes(String(sExt))
					: true;
			// s 判断是否是图片或者视频，如果是并且已经加载则判断是否符合尺寸过滤器
			const isSizeMatch =
				(sType === "image" || sType === "video") && isLoaded
					? sWidth! >= filters.size.width[0] &&
					  sHeight! >= filters.size.height[0]
					: true;
			const isMatchKeyWords =
				isKeywordsMatch(title, keywords) || isKeywordsMatch(tags, keywords);

			// s 判断是否所有条件都匹配
			const isMatch =
				isNotExclude && isExtensionMatch && isSizeMatch && isMatchKeyWords;
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
						other.push(card);
						break;
				}
			}
			return isMatch;
		});

		return { all, image, video, zip, audio, html, other };
	});

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
	const selectionCardList = computed<{
		[key in CardType]: Card[];
	}>(() => {
		return {
			all: filterCardList.value.all.filter((x) => x.isSelected),
			image: filterCardList.value.image.filter((x) => x.isSelected),
			video: filterCardList.value.video.filter((x) => x.isSelected),
			audio: filterCardList.value.audio.filter((x) => x.isSelected),
			zip: filterCardList.value.zip.filter((x) => x.isSelected),
			html: filterCardList.value.html.filter((x) => x.isSelected),
			other: filterCardList.value.other.filter((x) => x.isSelected),
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
	async function getPageCard(
		options: {
			onGet: (stop: () => void) => void;
		} = {
			onGet: () => {},
		}
	) {
		const { onGet } = options;
		let stopFlag = false;

		const patternId = patternStore.used.id;
		const patternNow =
			patternStore.findPattern(patternId) || patternStore.list[0];
		console.log("当前方案", patternNow);

		if (!patternNow.rules.length) {
			ElNotification({
				title: "提示",
				type: "warning",
				message: "该方案没有包含任何规则！(请为方案添加规则后再进行此操作)",
				appendTo: ".web-img-collector__notification",
			});
			return;
		}

		// 记录新卡片数据
		const newCardList: Card[] = [];

		loadingStore.start();

		// s 依次执行每个规则
		for (let i = 0; i < patternNow.rules.length; i++) {
			if (stopFlag) break;
			const rule = patternNow.rules[i];
			if (!rule.enable) continue; //为启用的规则就跳过
			await getCard(
				// 规则配置
				rule,
				// 选项配置
				{
					// * 当获取到所有基准dom时的回调
					onAllDOMGet: async (doms) => {
						// console.log("匹配到的DOM", doms);
						loadingStore.update(0, doms.length);
						return doms;
					},
					// * 当获得卡片时的回调
					onCardGet: async (card, index, dom, addCard, stop) => {
						if (stopFlag) {
							stop();
							return;
						}
						// 更新进度条
						loadingStore.update(index + 1);
						const sourceMeta = card.source.meta;
						const previewMeta = card.preview.meta;
						// console.log(sourceMeta, previewMeta);

						// ? 判断该卡片中的链接是否已经存在于集合中，如果存在则不添加到卡片列表中。
						if (
							(!previewMeta.valid &&
								!sourceMeta.valid &&
								(sourceMeta.type === "image" || sourceMeta.type === "video")) ||
							(data.urlSet.has(card.source.url) &&
								data.urlSet.has(card.preview.url))
						)
							return;

						if (dom) {
							// 记录dom用于排序
							data.domSet.add(dom);
						}

						// 添加到链接集合中 (用于后续去重比较)
						data.urlSet.add(card.source.url);
						// 添加到链接集合中 (用于后续去重比较)
						data.urlSet.add(card.preview.url);

						// 更新类型记录
						if (sourceMeta.type) {
							if (data.typeMap.has(sourceMeta.type)) {
								// 如果已经存在了就++
								data.typeMap.set(
									sourceMeta.type,
									data.typeMap.get(sourceMeta.type)! + 1
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
									data.extensionMap.get(sourceMeta.ext)! + 1
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
						newCardList.push(card);

						await addCard(); //执行回调函数
						// ? 判断是否终止后续操作
						onGet(() => {
							stop();
							stopFlag = true;
						});
					},
					// * 匹配结束后的回调
					onFinished() {},
				}
			);
		}

		data.cardList.push(...newCardList);

		nextTick(() => {
			if (!newCardList.length) {
				ElNotification({
					title: "提示",
					type: "info",
					message: "该方案未匹配到任何有效结果",
					appendTo: ".web-img-collector__notification",
				});
			}
		});

		loadingStore.end();
	}

	// f 重置过滤器
	function resetFilters() {
		filters.size.width = [250, sizeRange.value.width[1]];
		filters.size.height = [250, sizeRange.value.height[1]];
		filters.extension = [];
		filters.type = [];
	}

	// f 清空卡片
	async function clearCardList() {
		data.urlSet.clear(); // 清空链接集合
		data.domSet.clear(); // 清空DOM集合
		data.excludeIdSet.clear(); //清空被排除卡片id集合
		data.typeMap.clear(); // 清空类型映射表
		data.extensionMap.clear(); // 清空扩展名映射表
		data.urlBlobMap.clear(); // 清空url和blob的Map对象
		data.cardList = []; // 清空卡片列表
	}

	// f 移除卡片
	function removeCard(ids: string[]) {
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			data.excludeIdSet.add(id);
		}
	}

	// f 查询卡片
	function findCard(id: string): Card | undefined {
		return data.cardList.find((c) => c.id === id);
	}

	// f 查询多张卡片
	function findCards(ids: string[]): Card[] {
		return data.cardList.filter((c) => ids.includes(c.id)) || [];
	}

	// f 下载卡片
	async function downloadCards(cards: Card[]) {
		console.log("下载卡片", cards);

		if (!cards.length) return;
		if (cards.length === 1) {
			const card = cards[0];
			card.downloading = true;
			// 等于1的时候不打包，直接下载
			if (!card.source.blob) {
				// 如果没有blob先获取
				const blob = await getBlobByUrlAuto(card.source.url);
				if (blob) {
					card.source.blob = blob;
				}
			}
			let initName = card.description.title.trim();
			if (!initName) {
				initName = getNameByUrl(card.source.url);
			}
			card.downloading = false;
			// console.log(name);
			// 下载完成后让用户进行文件名确认
			ElMessageBox.prompt("文件已准备完成,请确认文件名", "提示", {
				appendTo: ".web-img-collector__notification",
				confirmButtonText: "确认",
				cancelButtonText: "取消",
				inputPlaceholder: "请输入要保存的文件名称",
				inputValue: legalizationPathString(initName),
				closeOnClickModal: false,
				draggable: true,
			})
				.then(({ value: name }) => {
					name = legalizationPathString(name);
					// console.log("保存文件名称:", name);
					// 添加后缀名
					name =
						card.source.meta.type !== "html"
							? name + `.${card.source.meta.ext}`
							: name + ".html";
					// 保存

					saveAs(card.source.blob!, name);
				})
				.catch(() => {
					// console.log("取消操作");
				});
		} else {
			loadingStore.start(cards.length); // 开启进度条

			ElNotification({
				title: "提示",
				message: "开始下载……",
				type: "info",
				appendTo: ".web-img-collector__notification",
			});

			// 大于1的时候进行打包
			// 创建zip容器
			const zipContainer = new JSZip();
			// 创建任务队列实例
			const taskQueue = new TaskQueue({
				interval: 10,
				maxConcurrent: 1,
				// 每个任务处理完成时的回调
				onTaskComplete(_, completed) {
					loadingStore.update(completed);
				},
				// 所有任务处理完成时的回调
				async onAllTasksComplete() {
					ElNotification({
						title: "提示",
						message: "下载完成！正在打包……",
						type: "info",
						appendTo: ".web-img-collector__notification",
					});

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
						}
					);

					// 下载压缩包
					// 获取标题
					let initZipName: string;
					const titles = [
						document.title,
						...[...document.querySelectorAll("h1")].map((dom) => dom.innerText),
						...[...document.querySelectorAll("title")].map(
							(dom) => dom.innerText
						),
					]
						.filter((title) => !!title && !!title.trim().length)
						.map((title) => title.replace("\\", "-").replace(",", "_"));
					if (titles.length) {
						initZipName = titles[0]; // 如果标题获取成功就使用首个标题
					} else {
						initZipName = getNameByUrl(safeDecodeURI(location.href)); // 如果标题获取失败就直接使用href提取标题
					}

					// s 下载完成后让用户进行文件名确认
					ElMessageBox.prompt("压缩包已准备完成,请确认文件名", "提示", {
						appendTo: ".web-img-collector__notification",
						confirmButtonText: "确认",
						cancelButtonText: "取消",
						inputPlaceholder: "请输入要保存的压缩包名称",
						inputValue: legalizationPathString(initZipName),
						closeOnClickModal: false,
						draggable: true,
					})
						.then(({ value: zipName }) => {
							zipName = legalizationPathString(zipName);
							console.log("保存压缩包名称:", zipName);
							saveAs(zip, `${zipName}.zip`);

							ElNotification({
								title: "成功",
								message: "开始下载压缩包……",
								type: "success",
								appendTo: ".web-img-collector__notification",
							});
						})
						.catch(() => {
							// console.log("取消操作");
						});

					loadingStore.end(); // 结束进度条
					// console.groupEnd();
				},
			});
			// 添加任务
			taskQueue.addTask(
				cards.map((card, i) => {
					return {
						handle: () =>
							new Promise<void | JSZip>((resolve) => {
								(async () => {
									if (!card.source.blob) {
										// 如果没有blob先获取
										card.downloading = true;
										const blob = await getBlobByUrlAuto(card.source.url);
										card.downloading = false;
										if (blob) {
											card.source.blob = blob;
										} else {
											// 如果获取失败就跳过
											resolve();
											return;
										}
										card.source.meta.type = getBlobType(card.source.blob);
										card.source.meta.ext = getExtByBlob(card.source.blob);
									}
									let name = card.description.title.trim();
									if (!name) {
										name = getNameByUrl(card.source.url);
									}
									if (card.source.meta.type !== "html") {
										name = name + `.${card.source.meta.ext}`;
									}
									// 将blob存入zip容器
									zipContainer.file(`${i} - ${name}`, card.source.blob);
									resolve(zipContainer);
								})();
							}),
					};
				})
			);
			// 运行队列
			taskQueue.run();
		}
	}

	return {
		data,
		sizeRange,
		sort,
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
		resetFilters,
	};
});
