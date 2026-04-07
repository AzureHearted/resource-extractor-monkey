import { isUrl, isBase64Img, getHostByUrl } from "../common";
import { GMRequest } from "../GMapi";
import { fetchWithProgress } from "./fetchWithProgress";

/**
 * 通过链接获取blob(自动)
 * @param url 链接
 * @param retray 重试次数 @default 3
 * @returns
 */
export async function getBlobByUrlAuto(
	url: string,
	retray: number = 3,
): Promise<Blob | null> {
	if (url == null || !url.trim().length || (!isUrl(url) && !isBase64Img(url)))
		return null;

	// 尝试获取blob
	const blob = await tryGetBlob(url, [
		// GM请求1
		{
			mode: "GM",
			retray,
			onProgress(loaded, total) {
				console.log(
					`GM请求 (${((loaded / total) * 100).toFixed(2)}%) ：${url}`,
				);
			},
			onError(_error, attempt, maxRetry) {
				console.warn(`GM请求失败 (${attempt}/${maxRetry}) ：${url}`);
			},
		},
		// GM请求2 (referer为当前域名)
		{
			mode: "GM",
			referer: location.origin + "/",
			retray,
			onProgress(loaded, total) {
				console.log(
					`GM请求(referer为当前域名) (${((loaded / total) * 100).toFixed(2)}%) ：${url}`,
				);
			},
			onError(_error, attempt, maxRetry) {
				console.warn(
					`GM请求(referer为当前域名)失败 (${attempt}/${maxRetry}) ：${url}`,
				);
			},
		},
		// GM请求3 (referer为链接域名)
		{
			mode: "GM",
			referer: getHostByUrl(url) + "/",
			retray,
			onProgress(loaded, total) {
				console.log(
					`GM请求(referer为链接域名) (${((loaded / total) * 100).toFixed(2)}%) ：${url}`,
				);
			},
			onError(_error, attempt, maxRetry) {
				console.warn(
					`GM请求(referer为链接域名)失败 (${attempt}/${maxRetry}) ：${url}`,
				);
			},
		},
		// Fetch请求
		{
			mode: "Fetch",
			retray,
			onProgress(loaded, total) {
				console.log(
					`Fetch请求 (${((loaded / total) * 100).toFixed(2)}%) ：${url}`,
				);
			},
			onError(_error, attempt, maxRetry) {
				console.warn(`Fetch请求失败 (${attempt}/${maxRetry}) ：${url}`);
			},
		},
	]);
	return blob;
}

// t 请求尝试队列
export interface TryGetBlobRequest {
	mode: "Fetch" | "GM";
	referer?: string;
	// 重试次数
	retray?: number;
	onProgress?: (loaded: number, total: number) => void;
	onError?: (error: any, attempt: number, maxRetry: number) => void;
}

/**
 * 尝试获取Blob
 * @param url 链接
 * @param requests 请求尝试队列 (通过传入的请求队列一次请求blob,一旦成功就直接返回结果)
 * @returns
 */
async function tryGetBlob(
	url: string,
	// 尝试队列
	requests: TryGetBlobRequest[],
): Promise<Blob | null> {
	let blob: Blob | null = null;

	const objURL = new URL(url);
	const urlUnSearch = objURL.origin + objURL.pathname; // 去除查询语句的URL

	for (const request of requests) {
		let attempt = 0;
		const maxRetry = request.retray ?? 0;

		while (attempt < maxRetry) {
			try {
				// 1️⃣ 主请求
				blob = await getBlobByUrl(url, {
					mode: request.mode,
					referer: request.referer,
					onProgress: request.onProgress,
				}).catch(() => null);

				// 2️⃣ fallback：去 query 再试一次（只做一次）
				if (!blob && url !== urlUnSearch) {
					blob = await getBlobByUrl(urlUnSearch, {
						mode: request.mode,
						referer: request.referer,
						onProgress: request.onProgress,
					}).catch(() => null);
				}

				// 成功
				if (blob) {
					return blob;
				}

				// 失败 → 准备重试
				attempt++;
				request.onError?.(null, attempt, maxRetry);
			} catch (err) {
				attempt++;
				request.onError?.(null, attempt, maxRetry);
			}
		}
	}

	return null;
}

// t 配置选项
interface GetBlobByUrlOptions {
	mode: "Fetch" | "GM";
	referer?: string;
	onProgress?: (loaded: number, total: number) => void;
}

/**
 * 通过链接获取blob
 * @param url 链接
 * @param mode 模式
 * @param referer
 * @returns
 */
export async function getBlobByUrl(url: string, options?: GetBlobByUrlOptions) {
	if (!url || !url.trim().length) return null;

	const { mode = "Fetch", referer, onProgress } = options ?? {};

	switch (mode) {
		case "Fetch":
			try {
				// Fetch 第一次尝试
				let res = await fetchWithProgress(url, {
					onProgress(info) {
						onProgress?.(info.loaded, info.total);
					},
				}).catch(() => null);

				if (res && res.ok) {
					const blob = await res.blob().catch(() => null);
					if (blob && blob.size) {
						return blob;
					}
				}

				// Fetch 第二次尝试（no-cache）
				res = await fetchWithProgress(url, {
					cache: "no-cache",
					onProgress(info) {
						onProgress?.(info.loaded, info.total);
					},
				}).catch(() => null);
				if (res && res.ok) {
					const blob = await res.blob().catch(() => null);
					if (blob && blob.size) {
						return blob;
					}
				}

				// 全部失败
				return null;
			} catch (e) {
				return null;
			}
		case "GM":
			const res = await GMRequest({
				method: "GET",
				url,
				referer,
				responseType: "blob",
				anonymous: true,
				onprogress(event) {
					onProgress?.(event.loaded, event.total);
				},
			});
			if (res.data != null) {
				return res.data;
			} else {
				return null;
			}
	}
}
