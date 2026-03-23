import { getExtByUrl, isBase64Img, isUrl } from "@/utils/common";
import { Meta } from "@/models/Card/Meta";
import { getDOMNaturalSize } from "./get-dom-natural-size";

// i 元信息陪自己对象
interface GetMetaOption {
	method: "auto" | "byNaturalSize" | "byImage" | "byUrl" | "byBlob";
	url?: string;
}

/**
 * 获取元信息
 * @param target 对象
 * @param option 配置
 * @returns 元信息
 */
export async function getMeta(
	target: string | Blob | HTMLElement,
	option?: Partial<GetMetaOption>,
): Promise<Meta> {
	const defaultMeta = new Meta({
		type: "html",
	});
	const { method = "auto", url } = { ...option };

	// 根据方式分发
	switch (method) {
		case "byNaturalSize":
			if (isDOMImageOrVideo(target)) return await getDOMMeta(target);
			break;
		case "byUrl":
			if (typeof target === "string" && isUrl(target))
				return await getMetaByUrl(new URL(target));
			break;
		case "byBlob":
			if (target instanceof Blob) return await getMetaByBlob(target);
			break;
		case "auto":
		default:
			return (await getMetaAuto(target, url)) || defaultMeta;
	}

	return defaultMeta;
}

/**
 * 自动获取
 * @param target 目标
 * @param url 链接（可选）
 * @returns
 */
async function getMetaAuto(
	target: string | Blob | HTMLElement,
	url?: string,
): Promise<Meta | null> {
	let meta = new Meta({ type: "html" }); //设置一个初始空值

	// DOM元素处理
	if (isDOMElement(target)) {
		meta = await getDOMMeta(target, url);
		// 假如meta有效，则直接返回
		if (meta.valid) return meta;
	}

	// URL字符串
	if (typeof target === "string" && (isUrl(target) || isBase64Img(target))) {
		const res = await getMetaByUrl(new URL(target), { type: "html" });
		// console.log(`推断结果`, res);
		return res;
	}

	// Blob对象
	if (target instanceof Blob) {
		return await getMetaByBlob(target);
	}

	// 其他情况
	return null;
}

// 获取元信息(通过url)
async function getMetaByUrl(url: URL, defaultMeta?: Partial<Meta>) {
	// meta初始值
	let meta = new Meta();

	meta = new Meta({ ...meta, ...defaultMeta });

	// 先推断链接类型
	const inferType = inferUrlType(url);

	if (inferType === "image") {
		// s 处理图片类型
		const res = await getMetaByImage(url.href);
		// console.log(`${url.href},推断为image，getMetaByImage结果`, res);
		res.ext = meta.ext || res.ext;
		meta = new Meta({ ...meta, ...res });
	} else if (inferType === "video") {
		// s 处理视频类型
		const res = await getMetaByVideo(url.href);
		res.ext = meta.ext || res.ext;
		meta = new Meta({ ...meta, ...res });
	} else {
		// s 其他类型
		meta = new Meta({
			...meta,
			type: inferType,
		});
	}

	return meta;
}

// 通过Image对象获取图片meta
function getMetaByImage(url: string): Promise<Meta> {
	if (!url || !url.trim().length) {
		const errMeta: Meta = new Meta();
		return Promise.resolve(errMeta);
	}
	let meta: Meta;

	return new Promise((resolve) => {
		let img: HTMLImageElement | null = new Image();

		// img.crossOrigin = "anonymous"; // 必须在设置 src 之前
		img.referrerPolicy = "no-referrer-when-downgrade";
		img.decoding = "async";

		img.src = url;
		if (img.complete) {
			// console.log("图片信息获取-->成功!");
			meta = new Meta({
				valid: true,
				width: img.width,
				height: img.height,
				type: "image",
				ext: getExtByUrl(url),
			});
			img = null; // s 用完后释放img对象
			resolve(meta);
		} else {
			img.addEventListener(
				"load",
				function () {
					// console.log("图片信息获取-->成功!");
					meta = new Meta({
						valid: true,
						width: this.width,
						height: this.height,
						type: "image",
						ext: getExtByUrl(url),
					});
					img = null; // s 用完后释放img对象
					resolve(meta);
				},
				{ once: true },
			);
			const onError = function (_e: Event) {
				// console.log("图片信息获取-->失败!", e);
				meta = new Meta({
					ext: getExtByUrl(url),
					type: "image", // 失败也需要设置为 image 类型
				});
				img = null; // s 用完后释放img对象
				resolve(meta);
			};
			img.addEventListener("error", onError, { once: true });
			img.addEventListener("abort", onError, { once: true });
			img.addEventListener("cancel", onError, { once: true });
		}
	});
}

// 通过Video对象获取视频meta
function getMetaByVideo(url: string): Promise<Meta> {
	if (!url || !url.trim().length) {
		console.log("链接无效", url);
		const errMeta: Meta = new Meta();
		return Promise.resolve(errMeta);
	}
	let meta: Meta;
	return new Promise((resolve) => {
		const video = document.createElement("video");
		video.onloadedmetadata = function () {
			// 获取视频宽度和高度
			const width = video.videoWidth;
			const height = video.videoHeight;
			// 释放资源
			URL.revokeObjectURL(video.src);
			resolve(
				new Meta({
					width,
					height,
					ext: getExtByUrl(url),
					type: "video",
					valid: true,
				}),
			);
		};
		video.onerror = function () {
			meta = new Meta({
				ext: getExtByUrl(url),
			});
			resolve(meta);
		};

		video.src = url;
		video.load();
	});
}

// 获取元信息(通过Blob对象)
async function getMetaByBlob(blob: Blob) {
	// meta初始值
	let meta: Meta = new Meta();
	// 先推断类型
	const blobType = inferBlobType(blob);
	// 判断主类型
	if (blobType.mainType === "image") {
		// 图片类型
		meta = new Meta({ ...meta, ...(await getImgMetaByBlob(blob)) });
	} else if (blobType.subType === "html" || blobType.mainType === "audio") {
		// html类型和audio类型
		meta.valid = true;
		meta.ext = blobType.subType;
	} else {
		// 其他类型暂不处理
		meta = new Meta({
			...meta,
			...{ ext: blobType.subType },
		});
	}
	return meta;
}

// 通过blob获取图片meta
function getImgMetaByBlob(blob: Blob) {
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
					meta = new Meta({
						valid: true,
						width: image.width,
						height: image.height,
					});
					// s 释放内存
					URL.revokeObjectURL((reader.result as string) || "");
					resolve(meta);
				});
				image.addEventListener(
					"error",
					() => {
						meta = new Meta();
						// s 释放内存
						URL.revokeObjectURL((reader.result as string) || "");
						resolve(meta);
					},
					{ once: true },
				);
			},
			{ once: true },
		);
		reader.addEventListener("error", () => {
			meta = new Meta();
			resolve(meta);
		});
	}) as Promise<Meta>;
}

// 判断变量是否是DOM元素
function isDOMElement(target: any): target is HTMLElement {
	return target instanceof HTMLElement;
}

// 判断是否是DOM Image/Video/Source
function isDOMImageOrVideo(
	target: any,
): target is HTMLImageElement | HTMLVideoElement {
	return (
		target instanceof HTMLImageElement || target instanceof HTMLVideoElement
	);
}

/**
 * DOM元素获取元信息
 * @param dom DOM元素
 * @param url 补充链接（可选, 通常是可能携带meta的url）
 * @returns
 */
async function getDOMMeta(dom: HTMLElement, url?: string): Promise<Meta> {
	const meta: Meta = new Meta({ type: "html" });

	if (
		dom instanceof HTMLImageElement &&
		url != null &&
		isUrl(url) &&
		inferUrlType(new URL(url)) === "image"
	) {
		meta.type = "image";
		const size = await getDOMNaturalSize(dom);
		if (size.ok)
			return new Meta({
				...meta,
				...size,
				valid: size.width > 0 && size.height > 0,
			});
	}

	if (
		dom instanceof HTMLVideoElement &&
		url != null &&
		isUrl(url) &&
		inferUrlType(new URL(url)) === "video"
	) {
		meta.type = "video";
		const res = await getMetaByUrl(new URL(url));
		if (res.valid)
			return new Meta({
				...meta,
				...res,
				valid: res.width > 0 && res.height > 0,
			});
	}

	if (dom instanceof HTMLSourceElement && url != null && isUrl(url)) {
		if (/^video/.test(dom.type))
			return new Meta({ ...meta, valid: true, type: "video" });
		if (/^audio/.test(dom.type))
			return new Meta({ ...meta, valid: true, type: "audio" });
	}

	return meta;
}

/**
 * 推断链接类型
 * @param url
 * @returns
 */
export function inferUrlType(url: URL) {
	const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp|ico|svg|avif)$/i;
	const videoRegex = /\.(mp4|avi|mov|mkv|mpeg|mpg|wmv|webm|m4v)$/i;
	const audioRegex = /\.(mp3|wav|ogg|aac|flac)$/i;
	const zipRegex = /\.(zip|rar|7z|tar|gz|bz2|xz)$/i;

	const imageBase64Regex = /^data:image\/.+?;base64,/i;

	let type: "image" | "video" | "html" | "zip" | "audio" | "other" = "html";

	// base64 优先
	if (imageBase64Regex.test(url.href)) {
		return "image";
	}

	// pathname 判断
	const pathname = url.pathname;
	if (imageRegex.test(pathname)) return "image";
	if (videoRegex.test(pathname)) return "video";
	if (audioRegex.test(pathname)) return "audio";
	if (zipRegex.test(pathname)) return "zip";

	// query 参数兜底
	const search = url.search;

	if (imageRegex.test(search)) return "image";
	if (videoRegex.test(search)) return "video";
	if (audioRegex.test(search)) return "audio";
	if (zipRegex.test(search)) return "zip";

	return type;
}

/**
 * 通过发送请求推断链接类型
 * @param url
 * @returns
 */
export async function inferUrlTypeByRequest(url: string) {
	console.log(`准备发送请求推断链接类型：${url}`);
	try {
		const res = await fetch(url, { method: "HEAD" });

		const contentType = res.headers.get("content-type") || "";

		if (contentType.startsWith("image/")) return "image";
		if (contentType.startsWith("video/")) return "video";
		if (contentType.startsWith("audio/")) return "audio";
		if (contentType.includes("zip")) return "zip";

		return "html";
	} catch {
		return "other";
	}
}

// blob类型接口
interface BlobType {
	mainType: "image" | "video" | "audio" | "html" | false;
	subType: string;
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

// t mime主类型
type MIMEMainType = "image" | "video" | "audio" | "text";

// 获取MIME的主次类型
function getMIMEinfo(mime: string) {
	const [mainType, subType] = mime.split("/").filter(Boolean) as [
		MIMEMainType,
		string,
	];
	return {
		mainType,
		subType,
	};
}
