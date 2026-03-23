import { GM_addValueChangeListener, GM_setValue } from "$";
import { exportCurrentPageAsSingleHTML } from "./exportCurrentPageAsSingleHTML";

/**
 * 注册背景页监听器
 */
export function registerBackgroundListener() {
	// 防重复
	if ((window as any).__RESOURCE_EXTRACTOR_MONKEY_WORKER__) return;
	(window as any).__RESOURCE_EXTRACTOR_MONKEY_WORKER__ = true;

	(async () => {
		const match = location.hash.match(/#sf=(.+)$/);
		if (!match) return;

		const taskId = match[1];
		const cmdKey = "sf_cmd_" + taskId;
		const resultKey = "sf_task_" + taskId;

		// ✅ 1. 先注册监听（非常关键）
		listenerExportCurrentPageAsSingleHTML(cmdKey, resultKey);

		// ✅ 2. 再发送 ready（顺序不能反）
		GM_setValue(cmdKey, {
			type: "ready",
			taskId,
		});
	})();
}

/**
 * 页面提取器监听器
 * @param cmdKey 命令key
 * @param resultKey 结果key
 */
function listenerExportCurrentPageAsSingleHTML(
	cmdKey: string,
	resultKey: string,
) {
	GM_addValueChangeListener(cmdKey, async (_, __, newVal: any, remote) => {
		console.log("收到消息", newVal, remote);

		if (!remote) return;
		if (!newVal) return;

		if (newVal.type === "start") {
			try {
				const result = await exportCurrentPageAsSingleHTML();

				const text = result.content;

				GM_setValue(resultKey, {
					status: "done",
					content: text,
					title: result.title,
				});

				setTimeout(() => window.close(), 500);
			} catch (e: any) {
				GM_setValue(resultKey, {
					status: "error",
					error: e?.message || String(e),
				});
			}
		}

		if (newVal.type === "cancel") {
			window.close();
		}
	});
}
