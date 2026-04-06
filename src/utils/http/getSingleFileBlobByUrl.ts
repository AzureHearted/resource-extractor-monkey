import {
	GM_deleteValue,
	GM_addValueChangeListener,
	GM_setValue,
	GM_removeValueChangeListener,
	GM_openInTab,
} from "$";

/**
 * 将指定 URL 页面打包为单文件 HTML（Blob）
 * @param url
 * @returns
 */
export function getSingleFileBlobByUrl(url: string): Promise<Blob> {
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
		const tab = GM_openInTab(url + "#sf=" + taskId, {
			active: false,
		});
	});
}
