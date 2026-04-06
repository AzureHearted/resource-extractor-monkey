import { GMRequest } from "../GMapi";

/**
 * 获取链接对应的HTML对象
 * @param url 链接
 * @returns
 */
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
