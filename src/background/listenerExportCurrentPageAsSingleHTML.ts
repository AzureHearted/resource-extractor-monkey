import { GM_addValueChangeListener, GM_setValue } from "$";
import { exportCurrentPageAsSingleHTML } from "@/utils";

/**
 * 页面提取器监听器
 * @param cmdKey 命令key
 * @param resultKey 结果key
 */
export function listenerExportCurrentPageAsSingleHTML(
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
