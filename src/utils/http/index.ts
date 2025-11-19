import { getHostByUrl, isBase64Img, isUrl } from "../common";
import { GMRequest } from "./GMRequest";

// f 通过链接获取blob
export function getBlobByUrl(
  url: string,
  mode: "Fetch" | "GM" = "Fetch",
  referer?: string
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
  requests: { mode: "Fetch" | "GM"; referer?: string; message?: string }[]
): Promise<Blob | null> {
  let blob: Blob | null = null;

  const objURL = new URL(url);
  const urlUnSearch = objURL.origin + objURL.pathname; // 去除查询语句的URL

  for (const request of requests) {
    // 打印日志消息
    if (request.message && !!request.message.trim().length) {
      console.log("[日志]WebImgCollector2:", `${request.message}: ${url}`);
    }
    // 请求blob
    blob = await getBlobByUrl(url, request.mode, request.referer);
    // ElNotification({
    // 	duration: 0,
    // 	title: "日志",
    // 	message: `mode:${request.mode},referer:${
    // 		request.referer
    // 	},请求结果:${!!blob}`,
    // 	type: "info",
    // 	appendTo: ".web-img-collector__notification-container",
    // });
    // 如果第一次失败且url去除查询语句后于与去除后不相同，则进行一次对去除查询语句后的url的请求
    if (!blob && url !== urlUnSearch) {
      blob = await getBlobByUrl(urlUnSearch, request.mode, request.referer);
      // ElNotification({
      // 	duration: 0,
      // 	title: "日志",
      // 	message: `(去除查询语句)mode:${request.mode},referer:${
      // 		request.referer
      // 	},请求结果:${!!blob}`,
      // 	type: "info",
      // 	appendTo: ".web-img-collector__notification-container",
      // });
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
      .catch((err) => {
        // console.log("获取链接对应的HTML对象(出错)", err);
        resolve(null);
      });
  });
}
