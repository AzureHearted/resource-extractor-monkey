import { useParallelTask, type Task } from "@/hooks/useParallelTask";
import type { Card } from "@/models/Card/Card";
import { getBlobType, getExtByBlob } from "@/utils/common";
import { getBlobByUrlAuto } from "@/utils/http";

interface Options {
	OnCardDownloadSuccess: (card: Card, index: number, completed: number) => void;
	OnCardDownloadError?: (card: Card, index: number) => void;
	/**
	 * 当所有卡片都下载完成的回调
	 * @param Cards
	 * @returns
	 */
	OnAllCardDownload: (
		Cards: Card[],
		completedCount: number,
		failedCount: number,
	) => void;
}

// f 下载卡片 Blob
export async function downloadBlob(cards: Card[], options: Options) {
	console.log("下载卡片Blob", cards);

	// 使用并行任务队列
	let { run } = useParallelTask(
		cards.map<Task<Card>>((card) => {
			return {
				handle: async () => {
					if (!card.source.blob) {
						// 如果没有blob先获取
						if (card.downloading) return card;
						card.downloading = true;
						const blob = await getBlobByUrlAuto(card.source.url);
						card.downloading = false;

						if (blob == null) {
							// 如果获取失败就跳过
							return card;
						}

						card.source.blob = blob;
						card.source.meta.type = getBlobType(card.source.blob);
						card.source.meta.ext = getExtByBlob(card.source.blob);
					}

					return card;
				},
				// 如果卡片的blob存在则补位延时设置为0，否则按照全局延时补位
				refillDelay: card.source.blob != null ? 0 : undefined,
			};
		}),
		{
			parallelCount: 3, // 并行任务数
			refillDelay: 250, // 补位延时
			onTaskComplete(index, card, completed) {
				// loadingStore.update(completed);
				options.OnCardDownloadSuccess(card, index, completed);
			},
			onTaskError(index, error) {
				console.log("卡片下载出错：", error);
				options.OnCardDownloadError?.(cards[index], index);
			},
			async onAllTasksComplete(completedCount, failedCount) {
				options.OnAllCardDownload(cards, completedCount, failedCount);
				return cards;
			},
		},
	);

	// 运行队列
	await run();
}
