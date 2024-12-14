// 匹配类型
type matchType =
	| "value"
	| "attribute"
	| "property"
	| "innerText"
	| "innerHTML"
	| "outerHTML";
// 获取Dom信息
export default async function getDOMInfo(
	dom: HTMLElement,
	type: matchType,
	name: string
) {
	let result = "";
	// console.log("getDOMInfo日志：", type, name, dom);
	switch (type) {
		case "value":
			// 处理值的情况
			result = getDOMValue(dom);
			break;
		case "attribute":
			// 处理Attribute属性的情况
			result = getDOMAttribute(dom, name);
			break;
		case "property":
			// 处理Property属性的情况
			result = getDOMProperty(dom, name);
			break;
		case "innerText":
			// 处理innerText的情况
			result = dom.innerText;
			break;
		case "innerHTML":
			// 处理innerHTML的情况
			result = dom.innerHTML;
			break;
		case "outerHTML":
			// 处理outerHTML的情况
			result = dom.outerHTML;
			break;
		default:
		// 默认情况
	}
	// 最后判断匹配结果是否是路径(或者路径的一部分)
	if (isUrl(result)) {
		result = urlCompletion(result); //s 路径补全
	}
	return result;
}

// 具有value属性的元素类型
const valueElements = [
	HTMLInputElement,
	HTMLTextAreaElement,
	HTMLSelectElement,
	HTMLOptionElement,
	HTMLButtonElement,
	HTMLMeterElement,
	HTMLProgressElement,
];

// 获取元素的值
function getDOMValue(dom: HTMLElement | null) {
	if (!dom) return "";
	// 判断DOM类型
	return valueElements.includes(dom.constructor as any)
		? (dom as any).value
		: "";
}
// 获取元素的attribute属性值
function getDOMAttribute(dom: HTMLElement | null, _name: string) {
	if (!dom) return "";
	let value = "";
	// 拆分name判断是否有多个值
	const names = _name.split("|");
	// 对每个值进行匹配
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		let temp: string | null = null;
		if (name === "src" || name === "href" || name === "srcset") {
			//! 是否是和链接相关的属性(如：src、href、srcset) 则使用property方式获取
			temp = getDOMProperty(dom, name);
			//s 判断是否不为空
			if (!!temp && !!temp.trim().length) {
				// 对匹配srcset时的特殊处理
				if (name === "srcset") {
					//s srcset属性信息的处理方式
					temp = getSrcsetMaximumValue(temp);
				}
			}
		} else {
			temp = dom.getAttribute(name);
		}
		if (temp) {
			value = temp;
			break;
		}
	}
	return value;
}

// 获取元素的property属性值
function getDOMProperty(dom: HTMLElement | null, _name: string) {
	if (!dom) return "";
	let value = "";
	// 拆分name判断是否有多个值
	const names = _name.split("|");
	// 对每个值进行匹配
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		// 判断元素上是否有该属性
		let temp;
		temp = dom[name as keyof HTMLElement] as string;
		//s 判断是否不为空
		if (!!temp && !!temp.trim().length) {
			// 对匹配srcset时的特殊处理
			if (name === "srcset") {
				//s srcset属性信息的处理方式
				temp = getSrcsetMaximumValue(temp);
			}
			value = temp || "";
			break;
		}
	}
	return value;
}

//f [功能封装] 获取srcset内容最大值
function getSrcsetMaximumValue(srcsetString: string) {
	let result = srcsetString;
	if (/\d+(w|x)/.test(srcsetString)) {
		const dataList = srcsetString
			.split(/, +/)
			.filter((item) => !!item && !!item.trim().length)
			.map((item) => {
				const itemDataInfos = item.split(" ");
				// console.log(itemDataInfos);
				if (itemDataInfos.length == 2) {
					const sizeList = itemDataInfos[1].split(/w|x/i);
					const size = sizeList ? sizeList[0] : 0;
					// console.log("size", size);
					return {
						url: itemDataInfos[0],
						resolution: size,
					};
				} else {
					return {
						url: itemDataInfos[0],
						resolution: 0,
					};
				}
			});
		// console.log(dataList);
		let maxItem = dataList[0];
		dataList.forEach((item) => {
			if (maxItem.resolution < item.resolution) {
				maxItem = item;
			}
		}); //s选区最大尺寸的链接
		result = maxItem.url;
	}
	return result;
}

// 判断字符串是否是一个url路径
function isUrl(str: string) {
	const v = /^(\/|(.\/)).+?$/i;
	return v.test(str);
}

//f url路径补全
function urlCompletion(_url: string): string {
	const v1 = /^\/[^/].*$/i; // 匹配以斜杠开头，斜杠后不是斜杠的字符串
	const v2 = /^\/\/.*$/i; // 匹配以两个斜杠开头，后面跟任意字符的字符串
	let url = _url; // 复制字符串，避免修改原始字符串
	// 如果字符串以斜杠开头，并且斜杠后不是斜杠，则补全为绝对路径，即加上当前页面的域名和协议部分。如果字符串以两个斜杠开头，则补全为绝对路径，即加上当前页面的域名和协议部分。
	if (v1.test(url)) {
		url = window.document.location.origin + url;
	} else if (v2.test(url)) {
		url = window.document.location.protocol + url;
	}
	// 最后返回补全后的字符串
	return url;
}
