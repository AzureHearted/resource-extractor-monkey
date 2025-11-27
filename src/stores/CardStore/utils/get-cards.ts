import { getDOM, getDOMInfo } from "@/utils/dom";
import type {
  BaseMatch,
  BaseRule,
  BaseFix,
} from "../../PatternStore/interface/Pattern";
import type {
  BaseMeta,
  CardDescription,
  CardPreview,
  CardSource,
} from "../interface";
import Card from "../class/Card";
// 导入请求工具
import {
  getExtByUrl,
  getNameByUrl,
  isBase64Img,
  isUrl,
  safeDecodeURI,
} from "@/utils/common";
// import { TaskQueue } from "@/utils/taskQueue";
// import type { Task } from "@/utils/taskQueue";
import { TaskQueue } from "@/utils/taskQueue";
import type { Task } from "@/utils/taskQueue";
import { getHTMLDocumentFromUrl } from "@/utils/http";

// 配置接口
interface Options {
  // 当获取到所有DOM时的回调
  onAllDOMGet: (doms: HTMLElement[]) => Promise<HTMLElement[]>;
  // 每当有一个卡片获取到的时候的回调
  onCardGet: (
    card: Card,
    index: number,
    dom: HTMLElement | null,
    addCard: () => Promise<void>,
    stop: () => void
  ) => Promise<void>;
  onFinished: () => void;
}

// f 获取卡片
export default async function getCard(
  rule: BaseRule,
  options: Partial<Options>
) {
  // console.log("当前规则", rule);
  // 默认配置
  const defaultOptions: Options = {
    onAllDOMGet: async (doms) => doms,
    onCardGet: async () => {},
    onFinished: () => {},
  };
  // 合并配置
  options = { ...defaultOptions, ...options };
  const { onAllDOMGet, onCardGet, onFinished } = options as Options;

  // console.log(domList, taskList);

  return new Promise<void>(async (resolve) => {
    // 创建任务队列
    const taskQueue = new TaskQueue<Card>({
      interval: 10,
      maxConcurrent: 1,
      // onTaskComplete: (result, count) => {
      // 	console.log("任务完成", result, count);
      // },
      // * 所有任务执行完成后调用resolve
      onAllTasksComplete: () => {
        onFinished();
        resolve();
      },
      // * 每次完成一个任务就进行一次判断，判断用户是否发出终止指令
      onTaskComplete: (result) => {
        // taskQueue.stop();
      },
      // onTaskOvertime(task, overtimeTasks) {
      // 	const index = taskList.findIndex(task);
      // 	const dom = domList[index];
      // 	console.log("任务超时", task.dom);
      // },
    });

    let stopFlag = false;

    // 卡片列表
    const cardList: Card[] = [];
    // 任务列表
    const taskList: Task<Card>[] = [];

    // dom列表
    const domList: HTMLElement[] = [];

    // 判断是否开启区域匹配
    if (rule.region.enable) {
      // ! 区域匹配模式
      // 区域DOM元素列表
      let regionDOMs: HTMLElement[] = getDOM(rule.region.selector, {
        mode: "all",
      }) as any[];
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
          // dom: regionDOM,
          handle: async () => {
            if (stopFlag) return new Card();

            // s source的匹配
            const source = await handleRegionGetInfo<CardSource>({
              rule: rule.source,
              regionDOM,
              callback: async (value, dom) => {
                dom = dom || regionDOM;
                // 元信息获取
                let meta = await getMeta(dom, { url: value }); // 获取元信息(通过dom)
                if (!meta.valid) {
                  meta = await getMeta(value); // 获取元信息(通过可能是url的匹配结果)
                }
                if (!meta.ext) {
                  meta.ext = getExtByUrl(value);
                }
                return {
                  url: value,
                  // 如果sourceDOM不存在，则使用当前区域DOM作为sourceDOM。
                  dom,
                  meta,
                };
              },
            });
            // s preview的匹配
            let preview: CardPreview;
            // 判断是否启用匹配preview
            if (rule.preview.enable) {
              // 判断是否指定了来源DOM
              let targetDOM: HTMLElement | null | false = false; //默认不指定
              if (rule.preview.origin === "region") {
                targetDOM = regionDOM;
              } else if (rule.preview.origin === "source") {
                targetDOM = source.dom;
              }
              // 获取preview
              preview = await handleRegionGetInfo<CardPreview>({
                rule: rule.preview,
                regionDOM,
                targetDOM,
                callback: async (value, dom) => {
                  // console.log("preview.url", value);
                  // 如果sourceDOM不存在，则使用当前区域DOM作为sourceDOM。
                  dom = dom || source.dom || regionDOM;
                  // 如果preview.url为空，则尝试使用source.url作为preview.url，因为可能没有预览图，只有链接。
                  value = value.trim() || source.url;
                  // 先修正内容
                  value = await fixResult(value, rule.preview.fix);
                  if (value !== source.url) {
                    // 元信息获取
                    let meta = await getMeta(dom, { url: value }); // 获取元信息(通过dom)
                    if (!meta.valid) {
                      meta = await getMeta(value); // 获取元信息(通过可能是url的匹配结果)
                    }
                    if (!meta.ext) {
                      meta.ext = getExtByUrl(value);
                    }
                    // console.log(meta);
                    return {
                      url: value,
                      dom,
                      meta,
                    };
                  } else {
                    return {
                      url: value,
                      dom,
                      meta: { ...source.meta },
                    };
                  }
                },
              });
            } else {
              // 如果不匹配就直接使用source
              preview = {
                url: source.url,
                dom: source.dom,
                meta: {
                  ...source.meta!,
                },
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
              if (!preview.meta.ext) {
                preview.meta.ext = getExtByUrl(preview.url);
                //TODO 这里由于使用油猴的API，在部分IOS的油猴脚本环境中可能无法正常调用(暂时弃用)
                // if (!preview.meta.ext) {
                // 	const { subType } = getMIMEinfo(
                // 		await getContentType(preview.url)
                // 	);
                // 	preview.meta.ext = subType;
                // }
              }
            }

            // s description的匹配
            let description: CardDescription;
            if (rule.description.enable) {
              // 判断是否指定了来源DOM
              let targetDOM: HTMLElement | null | false = false; //默认不指定
              if (rule.description.origin === "region") {
                targetDOM = regionDOM;
              } else if (rule.description.origin === "source") {
                targetDOM = source.dom;
              } else if (
                rule.description.origin === "preview" &&
                rule.preview.enable
              ) {
                targetDOM = preview.dom;
              }
              // 匹配描述信息
              description = await handleRegionGetInfo<CardDescription>({
                rule: rule.description,
                regionDOM,
                targetDOM,
                callback: async (value, dom) => {
                  // 如果sourceDOM不存在，则使用当前区域DOM作为sourceDOM。
                  dom = dom || source.dom || regionDOM || preview.dom;
                  // 如果preview.url为空，则尝试使用source.url作为preview.url，因为可能没有预览图，只有链接。
                  value = value.trim() || source.url || preview.url;
                  // 先修正内容
                  value = await fixResult(value, rule.description.fix);
                  if (isUrl(value)) {
                    value = getNameByUrl(value);
                  }
                  value = safeDecodeURI(value);
                  return {
                    title: value,
                    dom,
                  };
                },
              });
            } else {
              // 如果不匹配就直接使用source
              description = {
                title: source.url,
                dom: source.dom,
              };

              // 对description进行进一步处理
              description.title = await fixResult(
                description.title,
                rule.description.fix
              );
              // 最后判断是否是链接，如果是链接则进行名称提取
              if (isUrl(description.title)) {
                description.title = getNameByUrl(description.title);
              }
              description.title = safeDecodeURI(description.title);
            }

            // s 设置卡片来源
            source.host = location.host;
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

            // console.log(card.source.meta, card.preview.meta);

            // ? 触发回调
            onCardGet(
              card,
              i,
              regionDOM,
              // ? 传出函数用给外部判断是否要添加该卡片
              async () => {
                cardList.push(card);
              },
              // ? 传出函数用给外部判断是否终止操作
              () => {
                taskQueue.stop();
                stopFlag = true;
                resolve();
              }
            );

            return card;
          },
        };
        // 存入任务
        taskList.push(task);
      }
    } else {
      // ! 全局匹配模式(先分别匹配source、preview、description，然后创建卡片)
      // 获取所有 sourceDOMs
      let sourceDOMs: HTMLElement[] = getDOM(rule.source.selector, {
        mode: "all",
      }) as any[];
      sourceDOMs = sourceDOMs.filter((x) => x) as HTMLElement[]; //过滤无效值
      // 触发回调(进行dom过滤)
      sourceDOMs = await onAllDOMGet(sourceDOMs);

      // * 记录dom列表
      domList.push(...sourceDOMs);

      // 获取所有 previewDOMs
      let previewDOMs = (
        rule.preview.enable
          ? getDOM(rule.preview.selector, {
              mode: "all",
            })
          : sourceDOMs
      ) as (HTMLElement | null)[];
      // 获取所有 descriptionDOMs
      let descriptionDOMs = (
        rule.description.enable
          ? getDOM(rule.description.selector, {
              mode: "all",
            })
          : sourceDOMs
      ) as (HTMLElement | null)[];

      // 将所有DOMs长度统一成sourceDOMs的长度，因为它们应该是一一对应的。
      const maxLength = Math.max(
        sourceDOMs.length,
        previewDOMs.length,
        descriptionDOMs.length
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
            if (stopFlag) return new Card();
            // s 直接获取source信息
            const source: CardSource = {
              url: await getDOMInfo(
                sourceDOM,
                rule.source.infoType,
                rule.source.name
              ),
              dom: sourceDOM,
              meta: {
                valid: false,
                width: 0,
                height: 0,
                type: false,
                ext: false,
              }, // 初始化meta未一个无效值
            };
            // 对source进行进一步处理
            source.url = await fixResult(source.url, rule.source.fix);
            // 获取source.meta
            // 先使用dom进行判断
            // console.log("开始获取meta");
            source.meta = await getMeta(source.dom as HTMLElement, {
              url: source.url,
            });
            // console.log("获取到meta", source.meta);

            source.meta.ext = getExtByUrl(source.url);
            if (!source.meta.valid) {
              // 如果无效在使用匹配到的内容判断
              source.meta = await getMeta(source.url);
            }

            // s 获取preview信息
            let preview: CardPreview;
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
                      rule.preview.name
                    )
                  : "",
                dom: previewDOM,
                meta: {
                  valid: false,
                  width: 0,
                  height: 0,
                  type: "image",
                  ext: false,
                }, // 初始化meta未一个无效值
              };
            } else {
              preview = {
                url: source.url,
                dom: source.dom,
                meta: {
                  ...source.meta,
                },
                blob: source.blob,
              };
            }
            // 对preview进行进一步处理
            preview.url = await fixResult(preview.url, rule.preview.fix);

            // 获取preview.meta
            // 先使用dom进行判断
            preview.meta = await getMeta(preview.dom as HTMLElement, {
              url: preview.url,
            });
            preview.meta.ext = getExtByUrl(preview.url);
            if (!preview.meta.valid) {
              // 如果无效在使用匹配到的内容判断
              preview.meta = await getMeta(preview.url);
            }

            // s 获取description信息
            let description: CardDescription;
            if (rule.description.enable) {
              let descriptionDOM: HTMLElement | null;
              if (rule.description.origin === "preview")
                descriptionDOM = preview.dom;
              else if (rule.description.origin === "source")
                descriptionDOM = source.dom;
              else descriptionDOM = descriptionDOMs[i];
              // 获取描述信息
              description = {
                title: descriptionDOM
                  ? await getDOMInfo(
                      descriptionDOM,
                      rule.description.infoType,
                      rule.description.name
                    )
                  : "",
                dom: descriptionDOM,
              };
            } else {
              description = {
                title: source.url,
                dom: source.dom,
              };
            }
            // 对description进行进一步处理
            description.title = await fixResult(
              description.title,
              rule.description.fix
            );
            // 最后判断是否是链接，如果是链接则进行名称提取
            if (isUrl(description.title)) {
              description.title = getNameByUrl(description.title);
            }
            description.title = safeDecodeURI(description.title);

            // s 设置卡片来源
            source.host = location.host;
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

            // ? 触发回调
            onCardGet(
              card,
              i,
              source.dom,
              // ? 传出函数用给外部判断是否要添加该卡片
              async () => {
                cardList.push(card);
              },
              // ? 传出函数用给外部判断是否终止操作
              () => {
                taskQueue.stop();
                stopFlag = true;
                resolve();
              }
            );

            return card;
          },
        };
        // 存入任务
        taskList.push(task);
      }
    }

    // 添加任务
    taskQueue.addTask(taskList);
    // 开始执行任务队列
    taskQueue.run();
  });
}

// 获取在region模式下信息的处理函数
async function handleRegionGetInfo<T>(options: {
  rule: BaseMatch; // 规则对象
  regionDOM: HTMLElement | Document | null; // 区域DOM
  targetDOM?: HTMLElement | null | false; // 指定DOM
  callback: (value: string, dom: HTMLElement | null) => Promise<T>;
}) {
  const { rule, callback } = options;
  let { regionDOM, targetDOM } = options;
  regionDOM = regionDOM || document;
  // 获取选择器
  const { selector, infoType, name } = rule;

  // 获取DOM(只有来源DOM未指定时执行)
  if (targetDOM === false || targetDOM === undefined) {
    // 判断选择器是否为空
    if (!!selector && !!selector.trim().length) {
      // 如果不为空则正常使用选择器获取dom
      targetDOM = getDOM(selector, {
        regionDOM,
      }) as HTMLElement | null;
    } else {
      // 如果选择器为空，则使用当前区域DOM作为sourceDOM。
      targetDOM = regionDOM as HTMLElement;
    }
  }

  // 匹配信息
  let value: string = "";
  if (targetDOM) {
    value = await getDOMInfo(targetDOM, infoType, name);
  }

  if (targetDOM === undefined) targetDOM = null;

  // 获取结果修正
  value = await fixResult(value, rule.fix);
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
        }) as HTMLElement;
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
  value: T | null
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

interface GetMetaOption {
  method: "auto" | "byNaturalSize" | "byImage" | "byUrl" | "byBlob";
  url?: string;
}

// f 获取元信息(根据传入的值类型判断获取方式)
async function getMeta(
  target: string | Blob | HTMLElement,
  option?: Partial<GetMetaOption>
) {
  let meta: BaseMeta = {
    valid: false,
    width: 0,
    height: 0,
    type: "image",
    ext: false,
  }; //设置一个初始空值
  const defaultOption: GetMetaOption = {
    method: "auto",
  };
  const { method, url } = { ...defaultOption, ...option };
  // console.log("开始Meta获取 target:", target);
  if (method === "auto") {
    // s 按照优先级顺序一次尝试各种方式获取meta
    // s 按照DOM
    if (typeof target === "object" && target instanceof HTMLElement) {
      // console.log("获取元信息(类型:DOM元素)", target);
      if (!(target instanceof HTMLImageElement && target.srcset)) {
        // s 只有不含有srcset属性的img元素才能执行
        const { width, height } = await getDOMNaturalSize(target);
        meta = {
          ...meta,
          ...{ valid: width > 0 && height > 0, width, height, type: "image" },
        };
        // s 只有匹配到url不是data:image开头的video元素才能执行
        if (target instanceof HTMLVideoElement && url && url.trim()) {
          if (isUrl(url)) {
            if (inferUrlType(new URL(url)) === "video") {
              meta.type = "video";
            }
          } else {
            if (isBase64Img(url)) {
              return getMeta(url, { method: "byUrl" });
            }
            meta.type = "video";
          }
        }
        if (target instanceof HTMLSourceElement) {
          const sType = target.type;
          if (sType) {
            if (/^video/g.test(sType)) {
              meta.type = "video";
            } else if (/^audio/g.test(sType)) {
              meta.type = "audio";
            }
          }
          // console.log("source元素", meta);
        }
      }
      // console.log("getDOMNaturalSize 获取结果", target, meta);
      // console.count('通过HTML获取元信息')
    }
    // s 按照链接
    if (
      !meta.valid &&
      typeof target === "string" &&
      (isUrl(target) || isBase64Img(target))
    ) {
      // console.log("开始获取元信息(类型:链接)", target);
      const url = new URL(target);
      // 如果是一个链接
      // console.log("通过Url获取元信息(开始)");
      meta = await getMetaByUrl(url, { type: "image" });
      // console.log("通过Url获取元信息(成功)");
      // console.log("getMetaByUrl 获取结果", target, meta);
    }
    // s 按照Blob
    if (!meta.valid && typeof target === "object" && target instanceof Blob) {
      // console.log("开始通过Blob获取元信息", target);
      // 如果是一个Blob
      meta = await getMetaByBlob(target);
      // console.log("getMetaByBlob 获取结果", target, meta);
      // console.log("通过Blob获取元信息");
    }
  } else {
    // T 指定方式
    if (
      method === "byNaturalSize" &&
      typeof target === "object" &&
      target instanceof HTMLElement
    ) {
      // s DOM
      const { width, height } = await getDOMNaturalSize(target);
      meta = { ...meta, ...{ valid: width > 0 && height > 0, width, height } };
    } else if (
      method === "byUrl" &&
      typeof target === "string" &&
      isUrl(target)
    ) {
      // s 链接

      meta = await getMetaByUrl(new URL(target), { type: "image" });
    } else if (
      method === "byBlob" &&
      typeof target === "object" &&
      target instanceof Blob
    ) {
      // s Blob
      meta = await getMetaByBlob(target);
    } else {
      // 没有符合的匹配条件
      meta = {
        valid: false,
        width: 0,
        height: 0,
        type: false,
        ext: false,
      };
    }
  }

  return meta;
}

// 获取元信息(通过url)
async function getMetaByUrl(url: URL, _default: Partial<BaseMeta> = {}) {
  // meta初始值
  let meta: BaseMeta = {
    valid: false,
    width: 0,
    height: 0,
    ext: false,
    type: false,
  };
  meta = { ...meta, ..._default };
  // 先推断链接类型
  // s 初步推断
  const type = inferUrlType(url);

  //TODO 这里由于使用油猴的API，在部分IOS的油猴脚本环境中可能无法正常调用(暂时弃用)
  // if (type === "html") {
  // 	// s 如果还是html类型则尝试通过Head请求获取类型
  // 	const mime = await getContentType(url.href);
  // 	const { mainType, subType } = getMIMEinfo(mime);
  // 	if (mainType) {
  // 		if (mainType !== "text") {
  // 			type = mainType;
  // 			meta.ext = subType;
  // 		}
  // 	}
  // 	console.log("链接类型==>", type, mainType, subType);
  // }

  if (type === "image") {
    // s 处理图片类型
    // console.log("通过getImgMetaByImage获取Meta信息", url.href);
    const res = await getMetaByImage(url.href);
    res.ext = meta.ext || res.ext;
    meta = { ...meta, ...res };
    // console.log(meta);
  } else if (type === "video") {
    const res = await getMetaByVideo(url.href);
    res.ext = meta.ext || res.ext;
    // s 处理视频类型
    meta = { ...meta, ...res };
  } else {
    // s 其他类型
    meta = {
      ...meta,
      type,
    };
  }

  return meta;
}

// 获取元信息(通过Blob对象)
async function getMetaByBlob(blob: Blob) {
  // meta初始值
  let meta: BaseMeta = {
    valid: false,
    width: 0,
    height: 0,
    ext: false,
    type: false,
  };
  // 先推断类型
  const blobType = inferBlobType(blob);
  // 判断主类型
  if (blobType.mainType === "image") {
    // 图片类型
    meta = { ...meta, ...(await getImgMetaByBlob(blob)) };
  } else if (blobType.subType === "html" || blobType.mainType === "audio") {
    // html类型和audio类型
    meta.valid = true;
    meta.ext = blobType.subType;
  } else {
    // 其他类型暂不处理
    meta = {
      ...meta,
      ...{ ext: blobType.subType },
    };
  }
  return meta;
}

// f [功能封装]通过Image对象获取图片meta
export function getMetaByImage(url: string): Promise<BaseMeta> {
  if (!url || !url.trim().length) {
    console.log("链接无效", url);
    const errMeta: BaseMeta = {
      valid: false,
      width: 0,
      height: 0,
      aspectRatio: 1,
      type: false,
      ext: false,
    };
    return Promise.resolve(errMeta);
  }
  let meta: BaseMeta;

  return new Promise((resolve) => {
    let img: HTMLImageElement | null = new Image();
    img.src = url;
    img.referrerPolicy = "no-referrer-when-downgrade";
    if (img.complete) {
      // console.log("图片信息获取-->成功!");
      meta = {
        valid: true,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        type: "image",
        ext: getExtByUrl(url),
      };
      img = null; // s 用完后释放img对象
      resolve(meta);
    } else {
      img.addEventListener(
        "load",
        function () {
          // console.log("图片信息获取-->成功!");
          meta = {
            valid: true,
            width: this.width,
            height: this.height,
            aspectRatio: this.width / this.height,
            type: "image",
            ext: getExtByUrl(url),
          };
          img = null; // s 用完后释放img对象
          resolve(meta);
        },
        { once: true }
      );
      const error = function () {
        console.log("图片信息获取-->失败!");
        meta = {
          valid: false,
          width: 0,
          height: 0,
          type: false,
          ext: getExtByUrl(url),
        };
        img = null; // s 用完后释放img对象
        resolve(meta);
      };
      img.addEventListener("error", error, { once: true });
      img.addEventListener("abort", error, { once: true });
      img.addEventListener("cancel", error, { once: true });
    }
  });
}

// f [功能封装]通过Video对象获取视频meta
export function getMetaByVideo(url: string): Promise<BaseMeta> {
  if (!url || !url.trim().length) {
    console.log("链接无效", url);
    const errMeta: BaseMeta = {
      valid: false,
      width: 0,
      height: 0,
      aspectRatio: 1,
      type: false,
      ext: false,
    };
    return Promise.resolve(errMeta);
  }
  let meta: BaseMeta;
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.onloadedmetadata = function () {
      // 获取视频宽度和高度
      const width = video.videoWidth;
      const height = video.videoHeight;
      // 释放资源
      URL.revokeObjectURL(video.src);
      resolve({
        width,
        height,
        ext: getExtByUrl(url),
        type: "video",
        valid: true,
      });
    };
    video.onerror = function () {
      meta = {
        valid: false,
        width: 0,
        height: 0,
        type: false,
        ext: getExtByUrl(url),
      };
      resolve(meta);
    };

    video.src = url;
    video.load();
  });
}

// f [功能封装]通过blob获取图片meta
export function getImgMetaByBlob(blob: Blob) {
  type Meta = Pick<BaseMeta, "valid" | "width" | "height" | "aspectRatio">;
  let meta: Meta;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.addEventListener(
      "load",
      () => {
        const image = new Image();
        image.src = (reader.result as string) || "";
        image.addEventListener("load", () => {
          meta = {
            valid: true,
            width: image.width,
            height: image.height,
            aspectRatio: image.width / image.height,
          };
          // s 释放内存
          URL.revokeObjectURL((reader.result as string) || "");
          resolve(meta);
        });
        image.addEventListener(
          "error",
          () => {
            meta = {
              valid: false,
              width: 0,
              height: 0,
            };
            // s 释放内存
            URL.revokeObjectURL((reader.result as string) || "");
            resolve(meta);
          },
          { once: true }
        );
      },
      { once: true }
    );
    reader.addEventListener("error", () => {
      meta = {
        valid: false,
        width: 0,
        height: 0,
      };
      resolve(meta);
    });
  }) as Promise<Meta>;
}

// 获取DOM的natural尺寸
async function getDOMNaturalSize(dom: HTMLElement): Promise<{
  width: number;
  height: number;
}> {
  let [width, height] = [0, 0]; // 初始化宽高为0
  // 判断是否是img、video或canvas,如果是就获取自然宽高
  if (dom instanceof HTMLImageElement) {
    // 如果是img元素则等待img元素对应url的图片加载完毕后再获取
    if (dom.complete && dom.naturalWidth && dom.naturalHeight) {
      const { naturalWidth, naturalHeight } = dom;
      width = naturalWidth;
      height = naturalHeight;
      // console.log("原有img元素加载成功", dom.src, width, height);
    } else {
      // console.log("等待原有img元素加载……", dom.src);
      await new Promise((resolve) => {
        dom.onload = () => {
          const { naturalWidth, naturalHeight } = dom;
          width = naturalWidth;
          height = naturalHeight;
          // console.log("原有img元素加载成功", dom.src, width, height);
          resolve(true);
        };
        dom.onabort = () => {
          // console.log("原有img元素加载失败(中断)", dom.src);
          resolve(false);
        };
        dom.onerror = () => {
          // console.log("原有img元素加载失败", dom.src);
          resolve(false);
        };
        // 超时处理 5s
        setTimeout(() => {
          // console.log("原有img元素加载失败(超时)", dom.src);
          resolve(false);
        }, 5000);
      });
    }
  } else if (dom instanceof HTMLVideoElement) {
    const { videoWidth, videoHeight } = dom;
    width = videoWidth;
    height = videoHeight;
  } else if (dom instanceof HTMLCanvasElement) {
    ({ width, height } = dom);
  }
  return { width, height };
}

// 推断链接类型
function inferUrlType(url: URL) {
  // 推测链接类型
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp|icon|svg)$/gi;
  const imageBase64Regex = /^data:image\/.+?;base64,/gi;
  const videoRegex =
    /\.(mp4|avi|mov|mkv|mpeg|mpg|wmv|3gp|flv|f4v|rmvb|webm|ts|webp|ogv)$/gi;
  const audioRegex = /\.(mp3|wav|ogg|aac|flac)$/gi;
  const zipRegex = /\.(zip|rar|7z|tar|gz|bz2|xz)$/gi; // 压缩包类型

  // 默认标记类型为未确定
  let type: "image" | "video" | "html" | "zip" | "audio" | "other" | null =
    null;
  const urlStr = url.origin + url.pathname; //只保留“源”和“路径”防止查询参数干扰
  // console.log("进行类型推断-->", urlStr);
  // 根据文件扩展名判断类型
  if (imageRegex.test(urlStr) || imageBase64Regex.test(url.href)) {
    type = "image";
  } else if (videoRegex.test(urlStr)) {
    type = "video";
  } else if (audioRegex.test(urlStr)) {
    type = "audio";
  } else if (zipRegex.test(urlStr)) {
    type = "zip";
  } else {
    type = "html";
  }

  // console.log("推断链接类型", url.pathname, type);
  return type;
}

// blob类型接口
interface BlobType {
  mainType: "image" | "video" | "audio" | "html" | false;
  subType: string | false;
}

// 推测Blob类型
function inferBlobType(blob: Blob) {
  // 获取Blob的MIME类型，并判断是否为图片类型。
  const mimeType = getMIMEinfo(blob.type);
  const { mainType, subType } = mimeType;
  const blobType: BlobType = {
    mainType: mainType === "text" ? "html" : mainType, // 对主类型是text类型的特殊处理
    subType: subType === "jpeg" ? "jpg" : subType, // 处理子类型是jpeg的情况
  };
  return blobType;
}

type MIMEMainType = "image" | "video" | "audio" | "text";
// 获取MIME的主次类型
function getMIMEinfo(mime: string): {
  mainType: MIMEMainType | false;
  subType: string | false;
} {
  const [mainType = false, subType = false] = mime
    .split("/")
    .filter(Boolean) as [MIMEMainType | false, string | false];
  return {
    mainType,
    subType,
  };
}
