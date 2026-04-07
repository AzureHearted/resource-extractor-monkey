import { GMRequest } from "../GMapi";

/**
 * 获取链接对应的HTML对象
 * @param url 链接
 * @returns
 */
export async function getHTMLDocumentFromUrl(url: string) {
	const res = await GMRequest({
		url,
		method: "GET",
		responseType: "document",
		anonymous: true,
	}).catch(() => null);
	return res?.data ?? null;
}
