/**
 * 将当前页面提取为单文件 HTML
 * @returns html字符串内容
 */
export async function exportCurrentPageAsSingleHTML() {
	// 1. 克隆 DOM
	const docClone = document.cloneNode(true) as Document;

	// 2. 处理图片
	await inlineImages(docClone);

	// 3. 处理 canvas
	inlineCanvas(docClone);

	// 4. 处理样式
	await inlineStyles(docClone);

	// 5. 构建 HTML
	const html = "<!DOCTYPE html>\n" + docClone.documentElement.outerHTML;

	// return new Blob([html], { type: "text/html" });
	return { content: html, title: document.title };
}

async function inlineImages(doc: Document) {
	const images = Array.from(doc.images);

	await Promise.all(
		images.map(async (img) => {
			try {
				const src = img.src;
				if (!src || src.startsWith("data:")) return;

				const blob = await fetch(src).then((r) => r.blob());
				const base64 = await blobToBase64(blob);

				img.src = base64;
			} catch (e) {
				console.warn("图片内联失败:", img.src);
			}
		}),
	);
}

function inlineCanvas(doc: Document) {
	const canvasList = Array.from(document.querySelectorAll("canvas"));
	const clonedCanvasList = Array.from(doc.querySelectorAll("canvas"));

	canvasList.forEach((canvas, i) => {
		try {
			const dataUrl = canvas.toDataURL();
			const img = doc.createElement("img");
			img.src = dataUrl;

			clonedCanvasList[i].replaceWith(img);
		} catch {}
	});
}

async function inlineStyles(doc: Document) {
	const links = Array.from(
		doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
	);

	await Promise.all(
		links.map(async (link) => {
			try {
				const href = link.href;
				const cssText = await fetch(href).then((r) => r.text());

				const style = doc.createElement("style");
				style.textContent = cssText;

				link.replaceWith(style);
			} catch (e) {
				console.warn("CSS 内联失败:", link.href);
			}
		}),
	);
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.readAsDataURL(blob);
	});
}
