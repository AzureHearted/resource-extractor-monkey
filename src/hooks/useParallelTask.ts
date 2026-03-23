export interface Task<T> {
	/** 任务执行函数 */
	handle: () => Promise<T>;
	/** 当任务执行完成后，空位补任务延迟 @default undefined (默认受 options.refillDelay 控制) */
	refillDelay?: number | null;
}

interface Options<T> {
	/** 并发数（ms） @default 3 */
	parallelCount: number;

	/** 空位补任务延迟（ms） @default 250 */
	refillDelay?: number;

	onTaskComplete: (
		index: number,
		result: T,
		completedCount: number,
		stop: () => void,
	) => void;

	onTaskError: (index: number, error: any, task: Task<T>) => void;

	onAllTasksComplete: (completedCount: number, failedCount: number) => void;
}

export function useParallelTask<T = void>(
	tasks: Task<T>[],
	options?: Partial<Options<T>>,
) {
	const {
		parallelCount = 3,
		refillDelay = 250, // 延迟
	} = options || {};

	let nextIndex = 0; // 下一个要执行的任务索引
	let finishedCount = 0; // 成功数
	let failedCount = 0; // 失败数
	let runningCount = 0; // 当前运行中的任务数

	let stopFlag = false;
	let resolved = false;

	function stop() {
		stopFlag = true;
	}

	function run() {
		return new Promise<void>((resolve) => {
			if (tasks.length === 0) {
				options?.onAllTasksComplete?.(0, 0);
				resolve();
				return;
			}

			// 统一收尾（只会触发一次）
			function tryFinish() {
				if (resolved) return;

				// 正常完成
				if (finishedCount + failedCount === tasks.length) {
					resolved = true;
					options?.onAllTasksComplete?.(finishedCount, failedCount);
					resolve();
					return;
				}

				// 停止后：只要没有在运行的任务，就结束
				if (stopFlag && runningCount === 0) {
					resolved = true;
					options?.onAllTasksComplete?.(finishedCount, failedCount);
					resolve();
				}
			}

			// 核心调度器：补任务
			function schedule() {
				// 已停止就不再调度
				if (stopFlag) return;

				// 有空位 && 有任务
				while (runningCount < parallelCount && nextIndex < tasks.length) {
					runNext();
				}
			}

			// 执行一个任务
			function runNext() {
				if (stopFlag) return;

				const currentIndex = nextIndex++;
				const task = tasks[currentIndex];

				runningCount++;

				task
					.handle()
					.then((res) => {
						finishedCount++;
						// console.debug(`Task执行成功！:${currentIndex}`);
						options?.onTaskComplete?.(currentIndex, res, finishedCount, stop);
					})
					.catch((err) => {
						// console.debug(`Task执行失败！！:${currentIndex}`);
						failedCount++;
						options?.onTaskError?.(currentIndex, err, task);
					})
					.finally(() => {
						runningCount--;

						// 如果停止，直接尝试结束
						if (stopFlag) {
							tryFinish();
							return;
						}

						const delay =
							task.refillDelay === undefined
								? refillDelay
								: (task.refillDelay ?? 0);

						// 延迟补位（核心新增）
						if (delay > 0) {
							setTimeout(() => {
								// 判断是否阻断 schedule
								if (!stopFlag) {
									schedule();
								}
							}, delay);
						} else {
							schedule();
						}

						// 检查是否全部完成
						tryFinish();
					});
			}

			// 🚀 初始化启动
			schedule();
		});
	}

	return {
		run,
		stop,
	};
}
