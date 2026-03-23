import {
	GM_addValueChangeListener,
	GM_deleteValue,
	GM_openInTab,
	GM_removeValueChangeListener,
	GM_setValue,
	GM_xmlhttpRequest,
} from "$";
import { getHostByUrl, isBase64Img, isUrl } from "../common";
import { GMRequest } from "./GMRequest";

// f 通过链接获取blob
export function getBlobByUrl(
	url: string,
	mode: "Fetch" | "GM" = "Fetch",
	referer?: string,
): Promise<Blob | null> {
	// 防止url为空
	if (!url || !url.trim().length) return Promise.resolve(null);

	if (mode === "Fetch") {
		// 使用Fetch API
		return new Promise<Blob | null>((resolve) => {
			(async () => {
				// 首次尝试：直接通过链接获取
				// console.log("首次尝试：直接通过链接获取");
				let blob = await fetch(url)
					.then((res) => res.blob())
					.catch(() => null);
				if (blob && blob.size) {
					// console.log("Fetch请求成功", blob);
					console.count("Fetch请求成功!");
					return resolve(blob);
				}
				// 第二次尝试：如果第一次尝试失败则再次设置cache为no-cache再次尝试
				// console.log(
				// 	"第二次尝试：如果第一次尝试失败则再次设置cache为no-cache再次尝试"
				// );
				blob = await fetch(url, { cache: "no-cache" })
					.then((res) => res.blob())
					.catch(() => null);
				if (blob && blob.size) {
					// console.log("Fetch请求成功", blob);
					console.count("Fetch请求成功(no-cache)!");
					return resolve(blob);
				} else {
					console.count("Fetch请求失败");
					return resolve(null);
				}
			})();
		});
	} else {
		// 使用油猴GM_xmlhttpRequest的API
		return new Promise<Blob | null>((resolve) => {
			GMRequest({ url, referer, responseType: "blob" }).then((blob) => {
				if (blob && blob.size) {
					// console.log("GM请求成功", blob);
					console.count(`GM跨域请求成功${referer ? `(${referer})` : ""}!`);
					resolve(blob);
				} else {
					// console.log("GM请求失败", blob);
					console.count(`GM跨域请求失败${referer ? `(${referer})` : ""}`);
					resolve(null);
				}
			});
		});
	}
}

// f 通过链接获取blob(自动)
export async function getBlobByUrlAuto(url: string): Promise<Blob | null> {
	// console.log("请求", url);
	// s 链接为空直接返回空blob

	if (!url || !url.trim().length || !(isUrl(url) || isBase64Img(url)))
		return null;

	// 尝试获取blob
	const blob = await tryGetBlob(url, [
		{ mode: "Fetch" /* message: "Fetch请求" */ },
		{ mode: "GM" /* message: "GM请求1" */ },
		{
			mode: "GM",
			referer: location.origin + "/",
			// message: "GM请求2(referer为指定当前域名)",
		},
		{
			mode: "GM",
			referer: getHostByUrl(url) + "/",
			// message: "GM请求3(referer为链接域名)",
		},
	]);
	return blob;
}

// f 尝试获取Blob(通过传入的请求队列一次请求blob,一旦成功就直接返回结果)
async function tryGetBlob(
	url: string,
	// 尝试队列
	requests: { mode: "Fetch" | "GM"; referer?: string; message?: string }[],
): Promise<Blob | null> {
	let blob: Blob | null = null;

	const objURL = new URL(url);
	const urlUnSearch = objURL.origin + objURL.pathname; // 去除查询语句的URL

	for (const request of requests) {
		// 打印日志消息
		if (request.message && !!request.message.trim().length) {
			console.log(
				"[日志]Resource Extractor Monkey:",
				`${request.message}: ${url}`,
			);
		}
		// 请求blob
		blob = await getBlobByUrl(url, request.mode, request.referer);
		// 如果第一次失败且url去除查询语句后于与去除后不相同，则进行一次对去除查询语句后的url的请求
		if (!blob && url !== urlUnSearch) {
			blob = await getBlobByUrl(urlUnSearch, request.mode, request.referer);
		}
		// 一旦成功就跳出循环
		if (blob) break;
	}
	// console.log("请求结果blob:", blob);

	return blob;
}

// f 获取链接对应的HTML对象
export function getHTMLDocumentFromUrl(url: string): Promise<Document | null> {
	return new Promise((resolve) => {
		GMRequest({ url, responseType: "document" })
			.then((res) => {
				// console.log("获取链接对应的HTML对象：", res);
				resolve(res);
			})
			.catch((_err) => {
				// console.log("获取链接对应的HTML对象(出错)", err);
				resolve(null);
			});
	});
}

export async function detectLinkType(url: string) {
	// 1. 第一阶段：快速后缀名匹配 (零延迟)
	// const ext = url.split(/[#?]/)?[0].split(".").pop().toLowerCase();
	// const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
	// const videoExts = ["mp4", "webm", "ogg", "mov", "m4v"];

	// if (imageExts.includes(ext)) return { type: "image", ext };
	// if (videoExts.includes(ext)) return { type: "video", ext };

	// 2. 第二阶段：如果后缀无法判断，发起最小化请求
	try {
		// 使用 GM_xmlhttpRequest 绕过跨域限制
		return new Promise((resolve) => {
			GM_xmlhttpRequest({
				method: "GET",
				url: url,
				headers: { Range: "bytes=0-16" }, // 只请求前 17 个字节
				responseType: "arraybuffer",
				onload: function (response) {
					const bytes = new Uint8Array(response.response);
					const hex = Array.from(bytes)
						.map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
						.join(" ");

					// 检查图片魔数
					if (hex.startsWith("89 50 4E 47"))
						resolve({ type: "image", ext: "png" });
					else if (hex.startsWith("FF D8 FF"))
						resolve({ type: "image", ext: "jpg" });
					else if (hex.startsWith("47 49 46 38"))
						resolve({ type: "image", ext: "gif" });
					// 检查视频魔数 (MP4 常见包含 )
					else if (hex.includes("66 74 79 70"))
						resolve({ type: "video", ext: "mp4" });
					else resolve({ type: "unknown", hex });
				},
				onerror: () => resolve({ type: "error" }),
			});
		});
	} catch (e) {
		return { type: "unknown" };
	}
}

/**
 * f 将指定 URL 页面打包为单文件 HTML（Blob）
 */
export function getSingleFileBlobByUrl(targetUrl: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const taskId =
			"sf_" + Date.now() + "_" + Math.random().toString(36).slice(2);

		const cmdKey = "sf_cmd_" + taskId;
		const resultKey = "sf_task_" + taskId;

		const cleanup = () => {
			GM_deleteValue(cmdKey);
			GM_deleteValue(resultKey);
			try {
				tab?.close(); // ✅ 关闭 worker tab
			} catch (e) {
				console.warn("关闭 tab 失败", e);
			}
		};

		// ✅ 1️⃣ 监听 worker 的 ready 信号
		const cmdListener = GM_addValueChangeListener(
			cmdKey,
			(_, __, val: any, remote) => {
				if (!remote) return;
				if (!val) return;

				if (val.type === "ready") {
					console.log("[Main] worker ready:", taskId);

					// ✅ 收到 ready 再发 start
					GM_setValue(cmdKey, {
						type: "start",
						taskId,
					});
				}
			},
		);

		// ✅ 2️⃣ 监听执行结果
		const resultListener = GM_addValueChangeListener(
			resultKey,
			(_, __, val: any, remote) => {
				if (!remote) return;

				if (val?.status === "done") {
					console.log("[Main] worker done:", taskId);

					GM_removeValueChangeListener(cmdListener);
					GM_removeValueChangeListener(resultListener);

					const blob = new Blob([val.content], {
						type: "text/html",
					});

					cleanup();
					resolve(blob);
				}

				if (val?.status === "error") {
					console.log("[Main] worker error:", taskId);

					GM_removeValueChangeListener(cmdListener);
					GM_removeValueChangeListener(resultListener);

					cleanup();
					reject(new Error(val.error));
				}
			},
		);

		// ✅ 3️⃣ 打开 worker 页面
		const tab = GM_openInTab(targetUrl + "#sf=" + taskId, {
			active: false,
		});

		// ❌ 不再需要 setTimeout
	});
}
