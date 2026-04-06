import { isUrl, isBase64Img, getHostByUrl } from "../common";
import { GMRequest } from "../GMapi";

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
		// Fetch请求
		{
			mode: "Fetch",
			retray,
			// message: `Fetch请求:${url}`
		},
		// GM请求1
		{
			mode: "GM",
			retray,
			// message: `GM请求:${url}`
		},
		// GM请求2 (referer为当前域名)
		{
			mode: "GM",
			referer: location.origin + "/",
			retray,
			// message: `GM请求(referer为当前域名):${url}`,
		},
		// GM请求3 (referer为链接域名)
		{
			mode: "GM",
			referer: getHostByUrl(url) + "/",
			retray,
			// message: `GM请求(referer为链接域名):${url}`,
		},
	]);
	return blob;
}

export interface TryGetBlobRequest {
	mode: "Fetch" | "GM";
	referer?: string;
	message?: string;
	// 重试次数
	retray?: number;
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

		while (attempt <= maxRetry) {
			try {
				// 日志
				if (request.message?.trim()) {
					console.log(
						"[日志]Resource Extractor Monkey:",
						`${request.message}: ${url}`,
					);
				}

				// 1️⃣ 主请求
				blob = await getBlobByUrl(url, request.mode, request.referer).catch(
					() => null,
				);

				// 2️⃣ fallback：去 query 再试一次（只做一次）
				if (!blob && url !== urlUnSearch) {
					blob = await getBlobByUrl(
						urlUnSearch,
						request.mode,
						request.referer,
					).catch(() => null);
				}

				// console.log(`${url} (${request.mode}) 请求结果blob:`, blob);

				// 成功
				if (blob) {
					// console.log("请求结果blob:", blob);
					return blob;
				}

				// 失败 → 准备重试
				attempt++;

				console.warn(`请求失败(${attempt}/${maxRetry})`, url);
			} catch (err) {
				attempt++;

				console.warn(`请求失败(${attempt}/${maxRetry})`, url, err);
			}
		}
	}

	return null;
}

/**
 * 通过链接获取blob
 * @param url 链接
 * @param mode 模式
 * @param referer
 * @returns
 */
export function getBlobByUrl(
	url: string,
	mode: "Fetch" | "GM" = "Fetch",
	referer?: string,
): Promise<Blob | null> {
	if (!url || !url.trim().length) return Promise.resolve(null);

	switch (mode) {
		case "Fetch":
			return new Promise<Blob | null>((resolve, reject) => {
				(async () => {
					try {
						// ===== 第一次尝试 =====
						let res = await fetch(url).catch(() => null);
						if (res && res.ok) {
							const blob = await res.blob().catch(() => null);
							if (blob && blob.size) {
								// console.count("Fetch请求成功!");
								// console.log(res.headers.get("content-type"));
								return resolve(blob);
							}
						}

						// ===== 第二次尝试（no-cache）=====
						res = await fetch(url, { cache: "no-cache" }).catch(() => null);
						if (res && res.ok) {
							const blob = await res.blob().catch(() => null);
							if (blob && blob.size) {
								// console.count("Fetch请求成功(no-cache)!");
								// console.log(res.headers.get("content-type"));
								return resolve(blob);
							}
						}

						// ===== 全部失败 =====
						// console.count("[error] Fetch请求失败");
						reject(null);
					} catch (e) {
						reject(null);
					}
				})();
			});
		case "GM":
			// ===== GM 分支 =====
			return new Promise<Blob | null>((resolve, reject) => {
				GMRequest({ url, referer, responseType: "blob" })
					.then((blob) => {
						if (blob && blob.size) {
							// console.count(`GM 请求成功${referer ? `(${referer})` : ""}!`);
							console.log(blob.type);
							resolve(blob);
						} else {
							// console.count(`GM 请求失败${referer ? `(${referer})` : ""}`);
							// console.log(blob.type);
							reject(null);
						}
					})
					.catch(() => {
						// console.count(`GM 请求失败${referer ? `(${referer})` : ""}`);
						reject(null);
					});
			});
	}
}
