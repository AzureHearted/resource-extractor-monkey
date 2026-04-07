/// <reference types="vite-plugin-monkey/client" />
import { GM_xmlhttpRequest } from "$";

type GM_xmlhttpRequestParameters = Parameters<typeof GM_xmlhttpRequest>["0"];

// t 封装油猴 GM_xmlhttpRequest 的 API
interface GMRequestOptions {
	url: GM_xmlhttpRequestParameters["url"];
	method?: "GET" | "POST" | "HEAD";
	referer?: string;
	responseType?: GM_xmlhttpRequestParameters["responseType"];
	data?: GM_xmlhttpRequestParameters["data"];
	timeout?: GM_xmlhttpRequestParameters["timeout"];
	headers?: GM_xmlhttpRequestParameters["headers"];
	anonymous?: GM_xmlhttpRequestParameters["anonymous"];
	onprogress?: GM_xmlhttpRequestParameters["onprogress"];
}

// t 返回结果映射
interface GMResponseTypeMap {
	text: string;
	json: any;
	arraybuffer: ArrayBuffer;
	blob: Blob;
	document: Document;
	stream: ReadableStream<Uint8Array>;
}

// t 返回对象封装
interface GMRequestReTurnType<T extends keyof GMResponseTypeMap> {
	data?: GMResponseTypeMap[T];
	finalUrl: string;
	status: number;
}

// GM_xmlhttpRequest的二次封装
// 函数重载，允许调用GMRequest时强制指定responseType
export function GMRequest<ResponseType extends keyof GMResponseTypeMap>(
	options: GMRequestOptions & { responseType: ResponseType },
): Promise<GMRequestReTurnType<ResponseType>>;
// 默认情况下responseType为"json"
export function GMRequest(
	options: Omit<GMRequestOptions, "responseType"> & {
		responseType?: undefined;
	},
): Promise<GMRequestReTurnType<"json">>;
// 函数实现
export function GMRequest(options: GMRequestOptions) {
	const {
		url,
		method = "GET",
		referer,
		responseType = "json",
		data,
		timeout = 10000,
		headers = {},
		anonymous,
		onprogress,
	} = {
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
	return new Promise<GMRequestReTurnType<typeof responseType>>(
		(resolve, reject) => {
			GM_xmlhttpRequest({
				method,
				url,
				responseType,
				headers,
				data,
				timeout,
				anonymous,
				onload: (res) => {
					res.status;
					// 成功（注意：304 也算成功）
					if ((res.status >= 200 && res.status < 300) || res.status === 304) {
						resolve({
							data: res.response,
							finalUrl: res.finalUrl,
							status: res.status,
						});
					} else {
						reject(
							new Error(`GMRequest失败: status=${res.status}, url=${url}`),
						);
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
				onprogress,
			});
		},
	);
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
