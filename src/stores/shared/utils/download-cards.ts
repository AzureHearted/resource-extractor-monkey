import { useParallelTask, type Task } from "@/hooks/useParallelTask";
import type { Card } from "@/models/Card";
import {
	getExtByBlob,
	getNameByUrl,
	legalizationPathString,
	safeDecodeURI,
} from "@/utils/common";
import { getBlobByUrlAuto, getSingleFileBlobByUrl } from "@/utils/http";
import saveAs from "file-saver";
import JSZip from "jszip";
import { type FormValidationStatus, NFlex, NButton } from "naive-ui";
import type { DialogApiInjection } from "naive-ui/es/dialog/src/DialogProvider";
import type { NotificationApiInjection } from "naive-ui/es/notification/src/NotificationProvider";
import { computed, h, ref } from "vue";
import FilenameInputVue from "@/components/utils/filename-input/filename-input.vue";

interface Options {
	OnCardDownloadSuccess?: (
		card: Card,
		index: number,
		completed: number,
	) => void;
	OnCardBeforeDownload: (card: Card, index: number) => Promise<boolean>;
	OnCardEndDownload?: (card: Card, index: number) => void;
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
export async function downloadsBlob(
	cards: Card[],
	options: Options = {
		OnCardBeforeDownload: async () => true,
		OnAllCardDownload: () => {},
	},
) {
	// 使用并行任务队列
	let { run } = useParallelTask(
		cards.map<Task<Card>>((card, index) => {
			return {
				handle: async () => {
					if (!card.source.blob) {
						if (!(await options.OnCardBeforeDownload(card, index))) return card;

						const blob = await getBlobByUrlAuto(card.source.url).catch(
							() => null,
						);

						options.OnCardEndDownload?.(card, index);
						if (blob == null) {
							// 如果获取失败就跳过
							return card;
						}

						card.source.blob = blob;
						// card.source.meta.type = getBlobType(card.source.blob);
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
				options.OnCardDownloadSuccess?.(card, index, completed);
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
/**
 * 下载卡片
 * @param card 卡片
 * @param options 配置
 * @returns
 */
export async function downloadCard(
	card: Card,
	options: {
		dialog: DialogApiInjection;
		onBeforeDownload?: (card: Card) => void;
		onEndDownload?: (card: Card) => void;
	},
) {
	console.log("准备下载卡片", card);

	const { dialog, onBeforeDownload, onEndDownload } = options;

	onBeforeDownload?.(card);
	const { type } = card.source.meta;
	// 等于1的时候不打包，直接下载
	if (
		type === "image" ||
		type === "video" ||
		type === "audio" ||
		type === "zip"
	) {
		if (!card.source.blob) {
			// 如果没有blob先获取
			const blob = await getBlobByUrlAuto(card.source.url).catch(() => null);
			if (blob != null) {
				card.source.blob = blob;
			}
		}
	} else if (type === "html") {
		const blob = await getSingleFileBlobByUrl(card.source.url);
		console.log("网页下载结果：", blob);
		card.source.blob = blob;
	}

	let initName = card.description.content.trim();
	if (!initName) {
		initName = getNameByUrl(card.source.url);
	}
	onEndDownload?.(card);

	// 下载完成后让用户进行文件名确认
	let res = await new Promise<{ value: string; isOk: boolean }>((resolve) => {
		const text = ref(legalizationPathString(initName));
		const status = ref<FormValidationStatus>("success");
		const allowPositive = computed(() => status.value !== "success");

		const d = dialog.success({
			title: "文件下载",

			// 内容自定义
			content() {
				return h(FilenameInputVue, {
					name: text.value,
					label: "保存文件名：",
					placeholder: "输入要保存的文件名称",
					clearable: true,
					"onUpdate:name": (val) => {
						text.value = val;
					},
					"onUpdata:status": (val) => {
						status.value = val;
					},
				});
			},
			draggable: true,
			closeOnEsc: true,
			maskClosable: false,
			// 操作按钮自定义
			action() {
				return h(
					NFlex,
					{ size: 4 },
					{
						default: () => {
							return [
								h(
									NButton,
									{
										type: "default",
										style: "margin-right:12px",
										onClick() {
											resolve({ value: initName, isOk: false });
											d.destroy();
										},
									},
									{ default: () => "取消" },
								),
								h(
									NButton,
									{
										type: "primary",
										disabled: allowPositive.value,
										onClick() {
											resolve({ value: text.value, isOk: true });
											d.destroy();
										},
									},
									{ default: () => "确认" },
								),
							];
						},
					},
				);
			},
		});
	});

	if (!res.isOk) return;

	let name = res.value;

	name = legalizationPathString(name);

	// 添加后缀名
	name =
		card.source.meta.type !== "html"
			? name + `.${card.source.meta.ext}`
			: name + ".html";

	// 保存
	saveAs(card.source.blob!, name);
}

/**
 * 下载多个卡片并打包
 * @param cards 卡片
 * @param options 配置
 * @returns
 */
export async function downloadCards(
	cards: Card[],
	options: {
		dialog: DialogApiInjection;
		notification: NotificationApiInjection;
		/** 初始压缩包名称 */
		initZipName?: string;
		onProgressBeforeStart?: () => void;
		onProgressUpdate?: (current: number, total?: number) => void;
		onProgressEnd?: () => void;
		onBeforeDownload?: (card: Card) => void;
		onEndDownload?: (card: Card) => void;
	},
) {
	const {
		dialog,
		notification,
		onProgressBeforeStart,
		onProgressUpdate,
		onProgressEnd,
		onBeforeDownload,
		onEndDownload,
	} = options;
	console.log("下载卡片", cards);

	notification.info({
		title: "提示",
		content: "开始下载……",
		duration: 2000,
	});

	onProgressBeforeStart?.();

	// 创建zip容器
	const zipContainer = new JSZip();

	// 计算补零数
	const paddingZeroCount = String(cards.length).length;

	await downloadsBlob(cards, {
		OnCardDownloadSuccess(card, index, completed) {
			let name = card.description.content.trim();
			if (!name) {
				name = getNameByUrl(card.source.url);
			}
			if (card.source.meta.type !== "html") {
				name = name + `.${card.source.meta.ext}`;
			}
			// 将blob存入zip容器
			zipContainer.file(
				`${String(index).padStart(paddingZeroCount, "0")} - ${name}`,
				card.source.blob!,
			);
			// 更新进度
			onProgressUpdate?.(completed);
		},
		async OnAllCardDownload() {
			notification.info({
				title: "提示",
				content: "下载完成！正在打包……",
				duration: 2000,
			});

			// 重置进度
			onProgressUpdate?.(0, zipContainer.length);

			let currentFile: string | null = null;
			// s 生成压缩包
			const zip: Blob = await zipContainer.generateAsync(
				{
					type: "blob",
					compression: "STORE",
					streamFiles: true,
				},
				// 压缩的进度回调
				(metadata) => {
					if (currentFile !== metadata.currentFile) {
						currentFile = metadata.currentFile;
						onProgressUpdate?.(metadata.percent);
					}
				},
			);

			// 下载压缩包
			// 获取标题
			let initZipName: string;

			if (options.initZipName != null && options.initZipName.trim() != "") {
				initZipName = options.initZipName.trim();
			} else {
				const titles = [
					document.title,
					...[...document.querySelectorAll("h1")].map((dom) => dom.innerText),
					...[...document.querySelectorAll("title")].map(
						(dom) => dom.innerText,
					),
				]
					.filter((title) => !!title && !!title.trim().length)
					.map((title) => title.replace("\\", "-").replace(",", "_"));

				if (titles.length) {
					initZipName = titles[0]; // 如果标题获取成功就使用首个标题
				} else {
					initZipName = getNameByUrl(safeDecodeURI(location.href)); // 如果标题获取失败就直接使用href提取标题
				}
			}

			onProgressEnd?.();

			// 下载完成后让用户进行文件名确认
			let res = await new Promise<{ value: string; isOk: boolean }>(
				(resolve) => {
					const text = ref(legalizationPathString(initZipName));
					const status = ref<FormValidationStatus>("success");
					const allowPositive = computed(() => status.value !== "success");

					const d = dialog.success({
						title: "文件下载",
						// 内容自定义
						content() {
							return h(FilenameInputVue, {
								name: text.value,
								label: "保存文件名：",
								placeholder: "输入要保存的文件名称",
								clearable: true,
								"onUpdate:name": (val) => {
									text.value = val;
								},
								"onUpdata:status": (val) => {
									status.value = val;
								},
							});
						},
						draggable: true,
						closeOnEsc: true,
						maskClosable: false,
						// 操作按钮自定义
						action() {
							return h(
								NFlex,
								{ size: 4 },
								{
									default: () => {
										return [
											h(
												NButton,
												{
													type: "default",
													style: "margin-right:12px",
													onClick() {
														resolve({ value: initZipName, isOk: false });
														d.destroy();
													},
												},
												{ default: () => "取消" },
											),
											h(
												NButton,
												{
													type: "primary",
													disabled: allowPositive.value,
													onClick() {
														resolve({ value: text.value, isOk: true });
														d.destroy();
													},
												},
												{ default: () => "确认" },
											),
										];
									},
								},
							);
						},
					});
				},
			);

			if (!res.isOk) return;

			let zipName = res.value;
			zipName = legalizationPathString(zipName);
			console.log("保存压缩包名称:", zipName);
			saveAs(zip, `${zipName}.zip`);

			notification.success({
				title: "打包成功",
				content: "开始下载压缩包……",
				duration: 2000,
			});
		},
		async OnCardBeforeDownload(card) {
			onBeforeDownload?.(card);
			return true;
		},
		OnCardEndDownload(card) {
			onEndDownload?.(card);
		},
	});
}
