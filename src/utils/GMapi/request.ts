/// <reference types="vite-plugin-monkey/client" />
import { GM_xmlhttpRequest } from "$";

// 封装油猴GM_xmlhttpRequest的API
interface IGMRequestOptions {
	method?: "GET" | "POST" | "HEAD";
	url: string;
	referer?: string;
	responseType?: keyof GmResponseTypeMap;
	data?: string;
	timeout?: number;
	headers?: Record<string, string>;
}

// 返回结果映射
interface GmResponseTypeMap {
	text: string;
	json: any;
	arraybuffer: ArrayBuffer;
	blob: Blob;
	document: Document;
	stream: ReadableStream<Uint8Array>;
}

// f GM_xmlhttpRequest的二次封装
// 功能实现
// 函数重载，允许调用GMRequest时强制指定responseType
export function GMRequest<ResponseType extends keyof GmResponseTypeMap>(
	options: IGMRequestOptions & { responseType: ResponseType },
): Promise<GmResponseTypeMap[ResponseType]>;

// 默认情况下responseType为"json"
export function GMRequest(
	options: Omit<IGMRequestOptions, "responseType"> & {
		responseType?: undefined;
	},
): Promise<any>;

// 函数实现
export function GMRequest(options: IGMRequestOptions): Promise<any> {
	// 默认选项
	const defaultOptions: Required<
		Pick<IGMRequestOptions, "method" | "timeout">
	> = {
		method: "GET",
		timeout: 10000,
	};

	const {
		url,
		method,
		referer,
		responseType = "json",
		data,
		timeout,
		headers = {},
	} = {
		...defaultOptions,
		...options,
	};

	// 防止链接为空
	if (!url || !url.trim().length) {
		return Promise.reject(new Error("URL不能为空"));
	}

	// 合并 referer
	if (referer) {
		headers["referer"] = referer;
	}

	// 返回一个Promise（支持 reject，避免吞错）
	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method,
			url,
			responseType,
			headers,
			data,
			timeout,

			onload: (res) => {
				// 成功（注意：304 也算成功）
				if ((res.status >= 200 && res.status < 300) || res.status === 304) {
					resolve(res.response);
				} else {
					reject(new Error(`GMRequest失败: status=${res.status}, url=${url}`));
				}
			},

			onerror: (e) => {
				reject(new Error(`GMRequest网络错误: ${url} , 错误信息：${e.error}`));
			},

			ontimeout: () => {
				reject(new Error(`GMRequest超时: ${url}`));
			},

			onabort: () => {
				reject(new Error(`GMRequest被中断: ${url}`));
			},
		});
	});
}

// f 获取链接对应的内容类型
export function getContentType(url: string): Promise<string> {
	console.count("getContentType");

	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method: "HEAD",
			url,

			onload: function (response) {
				if (response.status >= 200 && response.status < 300) {
					const match = response.responseHeaders.match(
						/content-type:\s*([^\n\r]+)/i,
					);

					resolve(match ? match[1].trim() : "unknown");
				} else {
					reject(new Error(`[getContentType] HTTP错误: ${response.status}`));
				}
			},

			onerror: function () {
				reject(new Error(`[getContentType] 请求失败`));
			},
		});
	});
}
