// t 自然尺寸结果
export type NaturalSizeResult =
	| { ok: true; width: number; height: number }
	| { ok: false; reason: "timeout" | "error" | "unsupported" };

/**
 * 获取DOM元素的自然大小
 * @param dom dom元素
 * @param options 配置
 * @returns 自然尺寸
 */
export async function getDOMNaturalSize(
	dom: HTMLElement,
	options?: {
		timeout?: number;
	},
): Promise<NaturalSizeResult> {
	const { timeout = 3000 } = options || {};

	// IMG
	if (dom instanceof HTMLImageElement) {
		// ✅ 已成功加载
		if (dom.complete) {
			if (dom.naturalWidth > 0 && dom.naturalHeight > 0) {
				return {
					ok: true,
					width: dom.naturalWidth,
					height: dom.naturalHeight,
				};
			}
			// ❗ 已完成但没尺寸 = 已失败
			return { ok: false, reason: "error" };
		}

		// ❗ 没 src
		if (!dom.currentSrc && !dom.src) {
			return { ok: false, reason: "error" };
		}

		// ❗ lazy 且未加载 → 不要等
		if (dom.loading === "lazy") {
			return { ok: false, reason: "unsupported" };
		}

		return waitForImageSize(dom, timeout);
	}

	// VIDEO
	if (dom instanceof HTMLVideoElement) {
		// ✅ 已有 metadata
		if (dom.videoWidth > 0 && dom.videoHeight > 0) {
			return {
				ok: true,
				width: dom.videoWidth,
				height: dom.videoHeight,
			};
		}

		// ❗ 没 src
		if (!dom.currentSrc && !dom.src) {
			return { ok: false, reason: "error" };
		}

		// ❗ preload=none → 基本不会加载
		if (dom.preload === "none") {
			return { ok: false, reason: "unsupported" };
		}

		return waitForVideoSize(dom, timeout);
	}

	return { ok: false, reason: "unsupported" };
}

/**
 * 等待图片尺寸
 * @param img img元素
 * @param timeout 超时
 * @returns 对应图片的自然尺寸
 */
function waitForImageSize(
	img: HTMLImageElement,
	timeout: number,
): Promise<NaturalSizeResult> {
	return new Promise((resolve) => {
		let done = false;
		let timer: number;

		const cleanup = () => {
			img.removeEventListener("load", onLoad);
			img.removeEventListener("error", onError);
			img.removeEventListener("abort", onError);
			clearTimeout(timer);
		};

		const finish = (result: NaturalSizeResult) => {
			if (done) return;
			done = true;
			cleanup();
			resolve(result);
		};

		const onLoad = () => {
			if (img.naturalWidth > 0 && img.naturalHeight > 0) {
				finish({
					ok: true,
					width: img.naturalWidth,
					height: img.naturalHeight,
				});
			} else {
				finish({ ok: false, reason: "error" });
			}
		};

		const onError = () => {
			finish({ ok: false, reason: "error" });
		};

		img.addEventListener("load", onLoad, { once: true });
		img.addEventListener("error", onError, { once: true });
		img.addEventListener("abort", onError, { once: true });

		timer = window.setTimeout(() => {
			finish({ ok: false, reason: "timeout" });
		}, timeout);
	});
}

/**
 * 等待视频尺寸
 * @param video video元素
 * @param timeout 超时
 * @returns 对应视频的自然尺寸
 */
function waitForVideoSize(
	video: HTMLVideoElement,
	timeout: number,
): Promise<NaturalSizeResult> {
	return new Promise((resolve) => {
		let done = false;
		let timer: number;

		const cleanup = () => {
			video.removeEventListener("loadedmetadata", onLoaded);
			video.removeEventListener("error", onError);
			clearTimeout(timer);
		};

		const finish = (result: NaturalSizeResult) => {
			if (done) return;
			done = true;
			cleanup();
			resolve(result);
		};

		const onLoaded = () => {
			if (video.videoWidth > 0 && video.videoHeight > 0) {
				finish({
					ok: true,
					width: video.videoWidth,
					height: video.videoHeight,
				});
			} else {
				finish({ ok: false, reason: "error" });
			}
		};

		const onError = () => {
			finish({ ok: false, reason: "error" });
		};

		video.addEventListener("loadedmetadata", onLoaded, { once: true });
		video.addEventListener("error", onError, { once: true });

		timer = window.setTimeout(() => {
			finish({ ok: false, reason: "timeout" });
		}, timeout);
	});
}
