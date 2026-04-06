export * from "./naturalCompare";

// 通过blob获取文件的ext扩展名
export function getExtByBlob(blob: Blob) {
	let ext = "";
	if (blob) {
		const match = /(?<=\/).+$/.exec(blob.type);
		if (match) {
			ext = match[0].trim().length > 0 ? match[0] : "";
		}
	}
	// 特殊情况处理
	if (ext === "jpeg") ext = "jpg";
	return ext;
}

// 获取站点Favicon图标
export function getFavicon(): string {
	let iconUrl: string;
	// s [1]通过link标签查找
	const urls = (
		[...document.querySelectorAll("link[rel=icon]")] as HTMLLinkElement[]
	)
		.map((item: HTMLLinkElement) => item.href)
		.filter((url) => /\.(png|svg|jpg|jpeg|webp|icon?)$/i.test(url));

	if (urls.length > 0) {
		iconUrl = urls[0];
	} else {
		// s [2]若没找到直接使用域名拼接
		iconUrl = `${location.origin}/favicon.ico`;
	}
	return iconUrl;
}

/**
 * 获取链接中的域名
 * @param url 链接
 * @returns 链接对应的域名
 */
export function getHostByUrl(url: string): string {
	const list = url.match(/(https?:\/\/[^/]+(?=\/))/g) || [];
	if (list.length > 0) {
		return list[0] || url;
	} else {
		return url;
	}
}

/**
 * 通过url获取名称
 * @param url 链接
 * @returns 链接的名称部分
 */
export function getNameByUrl(url: string): string {
	url = decodeURI(url);
	// 先尝试转为URL对象
	let urlObj: URL;
	try {
		urlObj = new URL(url);
	} catch {
		// 如果不是url则替换掉所有“/”“\”后返回
		return url.replace(/[/\\]/, "-");
	}
	// 去除查询参数和结尾的“/”
	urlObj.href = urlObj.href.replace(/([/\\])$/, "");
	const list = urlObj.href.match(/([^\?\\/\r\n\$\#]+?)$/g) || [];
	if (list.length > 0) {
		return list[0] || url;
	} else {
		return url;
	}
}

/**
 * 提取链接扩展名
 * @param url 链接
 * @param maxLength 扩展名最大长度
 * @returns
 */
export function getExtByUrl(url: string, maxLength: number = 6): string {
	let ext = "";
	const name = getNameByUrl(url);
	const pattern = `(?<=\\.)[^.]{1,${maxLength}}$`;
	const match = new RegExp(pattern).exec(name);
	if (match) {
		ext = match[0];
	}
	// 特殊情况处理
	if (ext === "jpeg") ext = "jpg";
	return ext;
}

// blob类型判断
export function getBlobType(blob: Blob): "image" | "video" | "html" | "audio" {
	const blobTypeRegex = {
		isImg: /^image/i,
		isVideo: /^video/i,
		isAudio: /^audio/i,
	};
	if (!blob) {
		return "html";
	}
	let blobType: "image" | "video" | "html" | "audio" = "html";
	if (blobTypeRegex.isImg.test(blob.type)) {
		blobType = "image";
	} else if (blobTypeRegex.isVideo.test(blob.type)) {
		blobType = "video";
	} else if (blobTypeRegex.isAudio.test(blob.type)) {
		blobType = "audio";
	} else {
		blobType = "html";
	}

	return blobType;
}

/**
 * 字节 -> 自动单位
 * @param byteSize 字节大小
 */
export function byteAutoUnit(byteSize: number, decimal: number = 2): string {
	// 单位映射表
	const unitMap = new Map([
		[1, "B"],
		[2, "KB"],
		[3, "MB"],
		[4, "GB"],
		[5, "TB"],
	]);
	let unit = 1;
	let num = byteSize;
	while (num / 1024 >= 1) {
		if (unit + 1 >= 1 && unit <= 5) {
			num = num / 1024;
			unit++;
		} else {
			break;
		}
	}
	return `${num.toFixed(decimal)}${unitMap.get(unit)}`;
}

// 推断字符串是否是链接
export function isUrl(str: string) {
	const regex = /^([^/]+?:)?\/\/[\w.,@?^=%&:/~+#-]+/gi;
	let isUrl = false;
	if (regex.test(str)) {
		try {
			new URL(str);
			isUrl = true;
		} catch {
			isUrl = false;
		}
	}
	return isUrl;
}

// 推断字符串是否是图片的base64
export function isBase64Img(str: string) {
	const regex = /^data:image\/.+?;base64,/gi;
	return regex.test(str);
}

/**
 * 合法化路径字符串
 * @param str 原始字符串
 * @returns 合法化后的字符串
 */
export function legalizationPathString(str: string) {
	return safeDecodeURI(str)
		.replace(/\*/g, "×")
		.replace(/\//g, "／")
		.replace(/⁄/g, "／")
		.replace(/\\/g, "＼")
		.replace(/\|/g, "︱")
		.replace(/\:/g, "：")
		.replace(/\?/g, "？")
		.replace(/"/g, "＂")
		.replace(/\</g, "＜")
		.replace(/\>/g, "＞")
		.replace(/\$/g, "＄");
}

/**
 * 判断两个URL字符串是否相等 (可选择是否包含search查询部分)
 * @param url1 链接1
 * @param url2 链接2
 * @param options 配置项
 * @returns
 */
export function isEqualUrl(
	url1: string,
	url2: string,
	options?: {
		/** 是否排除查询字符串(默认值:false) */
		excludeSearch?: boolean;
	},
) {
	const { excludeSearch: includeSearch } = {
		...({ includeSearch: false } as { includeSearch: boolean }), // 默认配置对象
		...options, // 用户传入的配置对象
	};
	// 判断是否需要判断查询字符串
	if (includeSearch) {
		let oURL1: URL | false = false,
			oURL2: URL | false = false;

		// 分别尝试转换两个url字符串未URL对象
		try {
			oURL1 = new URL(url1);
		} catch (error) {
			console.log(`url字符串：${url1} 转换为URL对象失败!`, error);
		}
		try {
			oURL2 = new URL(url2);
		} catch (error) {
			console.log(`url字符串：${url2} 转换为URL对象失败!`, error);
		}

		// 判断是否两个url字符串都是合法url
		if (oURL1 instanceof URL && oURL2 instanceof URL) {
			// 如果两个URL都合法
			return oURL1.origin + oURL1.pathname === oURL2.origin + oURL2.pathname;
		} else {
			// 如果两个URL有不合法URL对象(直接比较两个字符串结果是否相同)
			return url1 === url2;
		}
	} else {
		// 如果不需要判断查询字符串就直接比较两个字符串是否相等
		return url1 === url2;
	}
}

/**
 * 元素盒模型相关尺寸获取
 * @param element
 * @param property
 * @returns
 */
export function getDOMBoxValue(
	element: HTMLElement,
	property:
		| "padding-top"
		| "padding-right"
		| "padding-bottom"
		| "padding-left"
		| "margin-top"
		| "margin-right"
		| "margin-bottom"
		| "margin-left"
		| "border-top-width"
		| "border-right-width"
		| "border-bottom-width"
		| "border-left-width",
) {
	const computedStyle = window.getComputedStyle(element);
	return parseInt(computedStyle.getPropertyValue(property as string), 10);
}

/**
 * 安全的解码URI
 * @param str
 * @returns
 */
export function safeDecodeURI(str: string): string {
	try {
		return decodeURI(str);
	} catch {
		try {
			return decodeURIComponent(str);
		} catch {
			return str; // 如果都失败，就返回原字符串
		}
	}
}

// f 判断是否是移动端设备
export function isMobile(): boolean {
	const sUserAgent = navigator.userAgent.toLowerCase();
	const regex =
		/ipad|iphone os|midp|rv:1.2.3.4|ucweb|android|windows ce|windows mobile/i;
	return regex.test(sUserAgent);
}
