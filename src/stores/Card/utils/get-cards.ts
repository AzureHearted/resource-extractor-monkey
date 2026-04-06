import { getDOM, getDOMInfo } from "@/utils/dom";
import type { BaseMatch, Rule, BaseFix } from "@/models/Rule/interface/Rule";
import { Card, Meta } from "@/models/Card";

// 导入请求工具
import {
	getExtByUrl,
	getNameByUrl,
	isUrl,
	safeDecodeURI,
} from "@/utils/common";
import { getHTMLDocumentFromUrl } from "@/utils/http";
import { useParallelTask } from "@/hooks/useParallelTask";
import type { Task } from "@/hooks/useParallelTask";
import { getMeta, inferUrlType } from "./get-meta";

// 配置接口
interface Options {
	/** 要排除的祖先选择器 */
	excludeParentSelectors?: string[];
	// 当获取到所有DOM时的回调
	onAllDOMGet: (doms: HTMLElement[]) => Promise<HTMLElement[]>;
	// 每当有一个卡片获取到的时候的回调
	onCardGet: (
		card: Card,
		index: number,
		dom: HTMLElement | null,
		addCard: () => Promise<void>,
		stop: () => void,
	) => Promise<void>;
	onFinished: () => void;
}

/**
 * f 获取卡片
 * @param rule 匹配规则
 * @param options 选项
 * @returns
 */
export default function getCard(rule: Rule, options: Partial<Options>) {
	// 默认配置
	const defaultOptions: Options = {
		onAllDOMGet: async (doms) => doms,
		onCardGet: async () => {},
		onFinished: () => {},
	};
	// 合并配置
	options = { ...defaultOptions, ...options };
	const {
		onAllDOMGet,
		onCardGet,
		onFinished,
		excludeParentSelectors = [],
	} = options as Options;

	return new Promise<void>(async (resolve) => {
		// 卡片列表
		const newCardList: Card[] = [];
		// 任务列表
		const taskList: Task<Card>[] = [];
		// dom列表
		const domList: HTMLElement[] = [];

		// 判断是否开启区域匹配
		if (rule.region.enable) {
			// ! 区域匹配模式

			// 区域DOM元素列表
			let regionDOMs = getDOM(rule.region.selector, {
				mode: "all",
				excludeParentSelectors,
			}) as HTMLElement[];

			if (!regionDOMs) return;

			regionDOMs = regionDOMs.filter((x) => x) as HTMLElement[]; //过滤无效值

			// 触发回调(进行dom过滤)
			regionDOMs = await onAllDOMGet(regionDOMs);

			// * 记录dom列表
			domList.push(...regionDOMs);

			// 遍历所有区域dom，获取卡片dom列表
			for (let i = 0; i < regionDOMs.length; i++) {
				const regionDOM = regionDOMs[i]; // 拿到当前区域DOM
				// ? 定义任务
				const task: Task<Card> = {
					handle: async () => {
						// console.time(`任务：${i}`);
						// s source的匹配
						// console.timeLog(`任务：${i}`, "获取source信息");
						// console.log("source的匹配……");
						const source = await handleRegionGetInfo<Card["source"]>({
							rule: rule.source,
							regionDOM,
							callback: async (sourceValue, dom) => {
								dom = dom || regionDOM;
								// 元信息获取
								// console.timeLog(
								// 	`任务：${i}`,
								// 	"获取source信息 => 尝试通过DOM获取元信息",
								// );

								// 先修正内容
								sourceValue = await fixResult(
									sourceValue.trim(),
									rule.source.fix,
								);

								let meta = await getMeta(dom, { url: sourceValue }); // 获取元信息 (通过dom)
								// console.log(
								// 	`(${i}) 第 1 次获取 source 元信息 (dom):`,
								// 	meta,
								// 	sourceValue,
								// );

								// 当规则中没有启用 preview 匹配功能且 meta.valid 为 false 时，则尝试通过 sourceValue 进行元信息获取。
								if (!meta.valid) {
									if (!rule.preview.enable) {
										// console.timeLog(
										// 	`任务：${i}`,
										// 	"获取source信息 => 尝试通过Url获取元信息",
										// );
										meta = await getMeta(sourceValue); // 获取元信息 (通过可能是url的匹配结果)
										// console.log(
										// 	`(${i}) 第 2 次获取 source 元信息 (sourceValue):`,
										// 	meta,
										// 	sourceValue,
										// );
									}
								}

								// 推断类型
								try {
									if (rule.source.assertionType !== "auto") {
										meta.type = rule.source.assertionType;
									} else {
										if (!meta.valid || meta.type === "unknown")
											meta.type = inferUrlType(new URL(sourceValue));
									}
									// console.log(
									// 	`(${i}) source 元信息类型推断成功:`,
									// 	meta,
									// 	sourceValue,
									// );
								} catch {}

								if (!meta.ext) {
									meta.ext = getExtByUrl(sourceValue);
								}

								return {
									url: sourceValue,
									// 如果sourceDOM不存在，则使用当前区域DOM作为sourceDOM。
									dom,
									meta,
									host: location.host, // 设置来源
								};
							},
						});

						// s preview的匹配
						// console.log("preview的匹配……");
						let preview: Card["preview"];
						// 判断是否启用匹配preview
						if (rule.preview.enable) {
							// console.timeLog(`任务：${i}`, "获取preview信息");
							// 判断是否指定了来源DOM
							let targetDOM: HTMLElement | null = null; //默认不指定

							switch (rule.preview.origin) {
								case "region":
									targetDOM = regionDOM;
									break;
								case "source":
									targetDOM = source.dom;
									break;
								case "custom":
							}

							// 获取preview
							preview = await handleRegionGetInfo<Card["preview"]>({
								rule: rule.preview,
								regionDOM,
								targetDOM,
								callback: async (previewValue, dom) => {
									// 如果sourceDOM不存在，则使用当前区域DOM作为sourceDOM。
									dom = dom || source.dom || regionDOM;

									// 如果preview.url为空，则尝试使用source.url作为preview.url，因为可能没有预览图，只有链接。
									previewValue = previewValue.trim() || source.url;
									// console.log("previewValue 匹配结果：", previewValue);

									// 先修正内容
									previewValue = await fixResult(
										previewValue,
										rule.preview.fix,
									);

									let meta: Meta;

									if (previewValue === source.url && source.meta.valid) {
										meta = new Meta({ ...source.meta });
									} else {
										// 元信息获取
										// console.timeLog(
										// 	`任务：${i}`,
										// 	"获取preview信息 => 尝试通过DOM获取元信息"
										// );
										meta = await getMeta(dom, { url: previewValue }); // 获取元信息(通过dom)
										// console.log("第 1 次获取 preview 元信息 (dom)", meta);
										if (!meta.valid) {
											// console.timeLog(
											// 	`任务：${i}`,
											// 	"获取preview信息 => 尝试通过Url获取元信息"
											// );
											meta = await getMeta(previewValue); // 获取元信息(通过可能是url的匹配结果)
											// console.log(
											// 	"第 2 次获取 preview 元信息 (previewValue):",
											// 	meta,
											// );
										}
									}

									// 推断类型
									try {
										if (rule.preview.assertionType !== "auto") {
											meta.type = rule.preview.assertionType;
										} else {
											if (!meta.valid || meta.type === "unknown") {
												meta.type = inferUrlType(new URL(previewValue));
											}
										}
										// console.log(
										// 	`(${i}) preview 元信息类型推断成功:`,
										// 	meta,
										// 	sourceValue,
										// );
									} catch {}

									if (!meta.ext) {
										meta.ext = getExtByUrl(previewValue);
									}

									return {
										url: previewValue,
										dom,
										meta,
									};
								},
							});
						} else {
							// 如果不匹配就直接使用source
							preview = {
								url: source.url,
								dom: source.dom,
								meta: new Meta({
									...source.meta,
								}),
							};
							// 对preview进行进一步处理
							preview.url = await fixResult(preview.url, rule.preview.fix);
							// 获取preview.meta
							// 先使用dom进行判断
							preview.meta = await getMeta(preview.dom as HTMLElement, {
								url: preview.url,
							});
							if (!preview.meta.valid) {
								// 如果无效在使用匹配到的内容判断
								preview.meta = await getMeta(preview.url);
							}

							// 由于没有启用 preview 匹配，所以使用 source 类型
							preview.meta.type = source.meta.type;

							if (!preview.meta.ext) {
								preview.meta.ext = getExtByUrl(preview.url);
							}
						}

						// s description的匹配
						// console.timeLog(`任务：${i}`, "获取description信息");
						let description: Card["description"];
						if (rule.description.enable) {
							// 判断是否指定了来源DOM
							let targetDOM: HTMLElement | null = null; //默认不指定

							switch (rule.description.origin) {
								case "region":
									targetDOM = regionDOM;
									break;
								case "source":
									targetDOM = source.dom;
									break;
								case "preview":
									if (rule.preview.enable) {
										targetDOM = preview.dom;
									}
									break;
								case "custom":
							}

							// 匹配描述信息
							description = await handleRegionGetInfo<Card["description"]>({
								rule: rule.description,
								regionDOM,
								targetDOM,
								callback: async (descriptionValue, dom) => {
									dom = dom || source.dom || regionDOM;

									descriptionValue = descriptionValue.trim();

									// 先修正内容
									descriptionValue = await fixResult(
										descriptionValue,
										rule.description.fix,
									);

									if (isUrl(descriptionValue)) {
										descriptionValue = getNameByUrl(descriptionValue);
									}

									descriptionValue = safeDecodeURI(descriptionValue);

									return {
										content: descriptionValue,
										dom,
									};
								},
							});
						} else {
							// 如果不匹配就直接使用source
							description = {
								content: source.url,
								dom: source.dom,
							};

							// 对description进行进一步处理
							description.content = await fixResult(
								description.content,
								rule.description.fix,
							);
							// 最后判断是否是链接，如果是链接则进行名称提取
							if (isUrl(description.content)) {
								description.content = getNameByUrl(description.content);
							}
							description.content = safeDecodeURI(description.content);
						}

						if (source.originUrls?.length) {
							source.originUrls.push(location.origin + location.pathname);
						} else {
							source.originUrls = [location.origin + location.pathname];
						}

						// ! 特殊情况处理
						if (source.url === preview.url) {
							source.meta.type = preview.meta.type;
							source.meta.ext = preview.meta.ext;
						}

						// f 创建卡片
						const card = new Card({ source, preview, description });
						// console.timeLog(`任务：${i}`, `创建卡片`, card);

						// ? 触发回调
						onCardGet(
							card,
							i,
							regionDOM,
							// ? 传出函数用给外部判断是否要添加该卡片
							async () => {
								newCardList.push(card);
							},
							// ? 传出函数用给外部判断是否终止操作
							() => {
								stop();
							},
						);

						// console.timeEnd(`任务：${i}`);
						return card;
					},
				};
				// 存入任务
				taskList.push(task);
				// break;
			}
		} else {
			// ! 全局匹配模式(先分别匹配source、preview、description，然后创建卡片)
			// 获取所有 sourceDOMs
			let sourceDOMs = getDOM(rule.source.selector, {
				mode: "all",
				excludeParentSelectors,
			}) as HTMLElement[];
			sourceDOMs = sourceDOMs.filter((x) => x); //过滤无效值
			// 触发回调(进行dom过滤)
			sourceDOMs = await onAllDOMGet(sourceDOMs);

			// * 记录dom列表
			domList.push(...sourceDOMs);

			// 获取所有 previewDOMs
			let previewDOMs: Array<HTMLElement | null> = rule.preview.enable
				? (getDOM(rule.preview.selector, { mode: "all" }) as HTMLElement[])
				: sourceDOMs;

			// 获取所有 descriptionDOMs
			let descriptionDOMs: Array<HTMLElement | null> = rule.description.enable
				? (getDOM(rule.description.selector, { mode: "all" }) as HTMLElement[])
				: sourceDOMs;

			// 将所有DOMs长度统一成sourceDOMs的长度，因为它们应该是一一对应的。
			const maxLength = Math.max(
				sourceDOMs.length,
				previewDOMs.length,
				descriptionDOMs.length,
			);
			// 填充到最大长度，如果为空则用null填充。
			previewDOMs = fillArrayToLength(previewDOMs, maxLength, null);
			descriptionDOMs = fillArrayToLength(descriptionDOMs, maxLength, null);

			// 遍历所有sourceDOMs，获取卡片信息。
			for (let i = 0; i < sourceDOMs.length; i++) {
				const sourceDOM = sourceDOMs[i];
				// ? 定义任务
				const task: Task<Card> = {
					// dom: sourceDOM,
					handle: async () => {
						// console.time(`任务：${i}`);
						// s 直接获取source信息
						// console.timeLog(`任务：${i}`, "获取source信息");
						const source: Card["source"] = {
							url: await getDOMInfo(
								sourceDOM,
								rule.source.infoType,
								rule.source.name,
							),
							dom: sourceDOM,
							meta: new Meta(), // 初始化meta未一个无效值
							host: location.host,
						};
						// 对source进行进一步处理
						source.url = await fixResult(source.url.trim(), rule.source.fix);
						// 获取source.meta
						// 先使用dom进行判断
						if (source.dom != null)
							source.meta = await getMeta(source.dom, { url: source.url });

						// 如果还是获取到无效的元信息，则尝试通过url获取元信息 (前提是规则中没有启用 preview 匹配功能)
						if (!source.meta.valid && !rule.preview.enable) {
							// 如果无效在使用匹配到的内容判断
							source.meta = await getMeta(source.url);
						}

						// 类型判断
						try {
							if (rule.source.assertionType !== "auto") {
								source.meta.type = rule.source.assertionType;
							} else {
								if (!source.meta.valid || source.meta.type === "unknown") {
									source.meta.type = inferUrlType(new URL(source.url));
								}
							}
						} catch {}

						if (!source.meta.ext) {
							source.meta.ext = getExtByUrl(source.url);
						}

						// s 获取preview信息
						// console.timeLog(`任务：${i}`, "获取preview信息");
						let preview: Card["preview"];
						if (rule.preview.enable) {
							let previewDOM: HTMLElement | null;
							if (rule.preview.origin === "source") previewDOM = source.dom;
							else previewDOM = previewDOMs[i];

							// 获取到基础信息
							preview = {
								url: previewDOM
									? await getDOMInfo(
											previewDOM,
											rule.preview.infoType,
											rule.preview.name,
										)
									: "",
								dom: previewDOM,
								meta: new Meta(), // 初始化meta未一个无效值
							};
						} else {
							preview = {
								url: source.url,
								dom: source.dom,
								meta: new Meta({
									...source.meta,
								}),
								blob: source.blob,
							};
						}
						// 对preview进行进一步处理
						preview.url = await fixResult(preview.url, rule.preview.fix);

						// 获取preview.meta
						// 先使用dom进行判断
						if (preview.dom != null)
							preview.meta = await getMeta(preview.dom, { url: preview.url });

						if (!preview.meta.valid) {
							// 如果无效在使用匹配到的内容判断
							preview.meta = await getMeta(preview.url);
						}

						// 类型判断
						try {
							if (rule.preview.enable) {
								if (rule.preview.assertionType !== "auto") {
									preview.meta.type = rule.preview.assertionType;
								} else {
									if (!preview.meta.valid || preview.meta.type === "unknown") {
										preview.meta.type = inferUrlType(new URL(preview.url));
									}
								}
							} else {
								preview.meta.type = source.meta.type;
							}
						} catch {}

						if (!preview.meta.ext) {
							preview.meta.ext = getExtByUrl(preview.url);
						}

						// s 获取description信息
						// console.timeLog(`任务：${i}`, "获取description信息");
						let description: Card["description"];
						if (rule.description.enable) {
							let descriptionDOM: HTMLElement | null;
							if (rule.description.origin === "preview")
								descriptionDOM = preview.dom;
							else if (rule.description.origin === "source")
								descriptionDOM = source.dom;
							else descriptionDOM = descriptionDOMs[i];
							// 获取描述信息
							description = {
								content: descriptionDOM
									? await getDOMInfo(
											descriptionDOM,
											rule.description.infoType,
											rule.description.name,
										)
									: "",
								dom: descriptionDOM,
							};
						} else {
							description = {
								content: source.url,
								dom: source.dom,
							};
						}
						// 对description进行进一步处理
						description.content = await fixResult(
							description.content,
							rule.description.fix,
						);
						// 最后判断是否是链接，如果是链接则进行名称提取
						if (isUrl(description.content)) {
							description.content = getNameByUrl(description.content);
						}
						description.content = safeDecodeURI(description.content);

						if (source.originUrls?.length) {
							source.originUrls.push(location.origin + location.pathname);
						} else {
							source.originUrls = [location.origin + location.pathname];
						}

						// ! 特殊情况处理
						if (source.url === preview.url) {
							source.meta.type = preview.meta.type;
							source.meta.ext = preview.meta.ext;
						}

						// f 创建卡片
						const card = new Card({ source, preview, description });
						// console.timeLog(`任务：${i}`, `创建卡片`, card);

						// ? 触发回调
						onCardGet(
							card,
							i,
							source.dom,
							// ? 传出函数用给外部判断是否要添加该卡片
							async () => {
								newCardList.push(card);
							},
							// ? 传出函数用给外部判断是否终止操作
							() => {
								stop();
							},
						);

						// console.timeEnd(`任务：${i}`);
						return card;
					},
				};
				// 存入任务
				taskList.push(task);
			}
		}

		let { run, stop } = useParallelTask(taskList, {
			parallelCount: 3,
			refillDelay: 250,
			onTaskComplete: async (_index, _card, _completedCount, _stop) => {
				// console.log("完成", card);
			},
			onTaskError: (_index, error, task) => {
				console.log("执行出错", error, task);
			},
			// * 所有任务执行完成后调用resolve
			onAllTasksComplete: (_completedCount, _failedCount) => {
				// console.log(
				// 	`处理完成 completedCount: ${completedCount}, failedCount: ${failedCount}`
				// );
				onFinished();
				resolve();
			},
		});
		await run();
	});
}

// 获取在region模式下信息的处理函数
async function handleRegionGetInfo<T>(options: {
	rule: BaseMatch | Omit<BaseMatch, "assertionType">; // 规则对象
	regionDOM: HTMLElement | Document | null; // 区域DOM
	targetDOM?: HTMLElement | undefined | null; // 指定DOM
	callback: (value: string, dom: HTMLElement | null) => Promise<T>;
}) {
	const { rule, callback } = options;
	let { regionDOM, targetDOM } = options;
	regionDOM = regionDOM || document;
	// 获取选择器
	const { selector, infoType, name } = rule;

	// 获取DOM(只有来源DOM未指定时执行)
	if (targetDOM == null) {
		// 判断选择器是否为空
		if (!!selector && !!selector.trim().length) {
			// 如果不为空则正常使用选择器获取dom
			targetDOM = getDOM(selector, { regionDOM })[0];
		} else {
			// 如果选择器为空，则使用当前区域DOM作为sourceDOM。
			targetDOM = regionDOM as HTMLElement;
		}
	}

	// 匹配信息
	let value: string = "";

	if (targetDOM != null) {
		value = await getDOMInfo(targetDOM as HTMLElement, infoType, name);
	}

	// 获取结果修正
	// value = await fixResult(value, rule.fix);
	// console.log(`修正结果`, value);

	// 调用其回调函数将结果以对象形式返回
	return await callback(value, targetDOM);
}

// 修正结果
async function fixResult(value: string, fixRules: BaseFix[]): Promise<string> {
	for (let i = 0; i < fixRules.length; i++) {
		const fixRule = fixRules[i];
		const { type: fixType } = fixRule;
		if (fixType === "regex-replace" || fixType === "regex-extract") {
			// 尝试合成正则表达式
			const { expression } = fixRule;
			if (!expression.trim().length) continue; //如果表达式为空则跳过该规则
			const flags = [...new Set(["g", ...fixRule.flags])].join("");
			let regex: RegExp;
			try {
				regex = new RegExp(expression, flags);
			} catch (e) {
				console.error(e);
				continue; //如果失败则直接跳过该修正规则
			}
			// s 正则提取类型的修正
			if (fixType === "regex-extract") {
				const match = value.match(regex);
				// console.log("正则提取", value, regex, match);
				if (match) {
					value = match[0];
				}
			}
			// s 正则替换类型的修正
			if (fixType === "regex-replace") {
				// console.log("正则替换", value, regex, fixRule.replaceTo);
				value = value.replace(regex, fixRule.replaceTo);
			}
		} else if (fixType === "fetch-page-and-extract-content") {
			const { selector, infoType, name } = fixRule;
			// s 抓取页面并提取内容
			const doc = await getHTMLDocumentFromUrl(value);
			if (doc) {
				// console.log(`url:${value}\n获取到的Document对象`, doc.documentElement);
				const dom = getDOM(selector, {
					mode: "first",
					regionDOM: doc.documentElement,
				})[0];
				value = await getDOMInfo(dom, infoType, name);
				// console.log(`抓取页面并提取内容`, dom, value);
			}
		}
	}
	return value;
}

// 填充数组到指定长度，如果数组长度小于指定长度，则用value填充数组。
function fillArrayToLength<T>(
	array: (T | undefined | null)[],
	length: number,
	value: T | null,
): (T | null)[] {
	// 先对原数组中值为undefined和null的值进行替换，替换为value。
	const newArray = array.map((item) => (item ? item : value));
	// 如果数组长度已经大于或等于指定长度，则直接返回原始数组
	if (array.length >= length) {
		newArray;
	} else {
		// 计算需要添加的元素个数
		const elementsToAdd = length - newArray.length;
		// 循环添加元素到数组末尾
		for (let i = 0; i < elementsToAdd; i++) {
			newArray.push(value);
		}
	}
	return newArray;
}
