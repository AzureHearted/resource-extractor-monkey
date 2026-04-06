import { GM_setValue } from "$";
import { listenerExportCurrentPageAsSingleHTML } from "./listenerExportCurrentPageAsSingleHTML";

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
