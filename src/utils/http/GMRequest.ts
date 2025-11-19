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
	options: IGMRequestOptions & { responseType: ResponseType }
): Promise<GmResponseTypeMap[ResponseType] | null>;
// 默认情况下responseType为"json"
export function GMRequest(
	options: Omit<IGMRequestOptions, "responseType"> & {
		responseType?: undefined;
	}
): Promise<any | null>;
// 函数实现
export function GMRequest(options: IGMRequestOptions): Promise<any | null> {
	// 默认选项
	const defaultOptions: IGMRequestOptions = {
		url: "",
		method: "GET",
		responseType: "json",
		referer: undefined,
		data: "",
		timeout: 10000,
	};
	const { url, method, referer, responseType, data, timeout } = {
		...defaultOptions,
		...options,
	};
	// 防止链接为空
	if (!url || !url.trim().length) return Promise.resolve(null);
	let headers: Record<string, string> | undefined;
	if (referer) {
		headers = {
			referer,
		};
	}
	// 返回一个Promise
	return new Promise((resolve) => {
		(async () => {
			GM_xmlhttpRequest({
				method,
				url,
				responseType,
				headers,
				data,
				timeout,
				onload: (res) => {
					// console.log(res, res.response, res.status);
					if (res.status === 200) {
						// console.log(`GM成功(referer:${referer})`, res.response, res.status);
						resolve(res.response);
					} else {
						// console.log(`GM失败(referer:${referer})`, res.response, res.status);
						resolve(null);
					}
				},
				onerror: () => {
					// console.log(`GM失败(referer:${referer})`);

					resolve(null);
				},
				ontimeout: () => {
					console.log(`GM超时(referer:${referer})`);

					resolve(null);
				},
				onabort: () => {
					// console.log(`GM中断请求(referer:${referer})`);
					resolve(null);
				},
			});
		})();
	});
}

// f 获取链接对应的内容类型
export function getContentType(url: string): Promise<string> {
	console.count("getContentType");
	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method: "HEAD",
			url: url,
			onload: function (response) {
				// console.log(response);
				if (response.status >= 200 && response.status < 300) {
					const contentType = response.responseHeaders.match(
						/(?<=content-type: ?)(.+)/gi
					);
					resolve(contentType ? contentType[0].trim() : "unknown");
				} else {
					reject(`[getContentType] HTTP请求错误！状态码: ${response.status}`);
				}
			},
			onerror: function (error) {
				reject(`发生错误： ${error}`);
			},
		});
	});
}
