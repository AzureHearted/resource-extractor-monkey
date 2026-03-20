// i 任务类型定义

export interface Task<T> {
	/** 任务执行函数 */
	handle: () => Promise<T>;
}

// i 任务选项定义
interface Options<T> {
	/** 最大并发数 */
	parallelCount: number;

	/**
	 * 每当一个任务完成后的回调
	 * @param result 任务结果
	 * @param index 任务索引
	 * @param completedCount 已完成任务数
	 * @param stop 终止队列任务的执行函数
	 */
	onTaskComplete: (
		index: number,
		result: T,
		completedCount: number,
		stop: () => void,
	) => void;

	/**
	 * 每当一个任务失败后的回调
	 * @param index 任务索引
	 * @param error 错误信息
	 * @param task 失败的任务
	 */
	onTaskError: (index: number, error: any, task: Task<T>) => void;

	/**
	 * 每当一个任务失败超时后的回调
	 * @param index 任务索引
	 * @param task 超时的任务
	 * @param overtimeTasks 超时的任务列表
	 */
	onTaskOvertime: (
		index: number,
		task: Task<T>,
		overtimeTasks: Task<T>[],
	) => void;

	/**
	 * 每当所有任务都完成后的回调
	 * @param completedCount 总计完成任务数
	 * @param failedCount 失败任务数
	 */
	onAllTasksComplete: (completedCount: number, failedCount: number) => void;
}

// ? 并行任务运行器
export function useParallelTask<T = void>(
	tasks: Task<T>[],
	options?: Partial<Options<T>>,
) {
	/** 默认并发数为 2 */
	const { parallelCount = 2 } = options || {};

	// 任务索引
	let nextIndex = 0;
	// 已完成任务数
	let finishedCount = 0;
	// 失败任务数
	let failedCount = 0;

	// 暂停
	let pause = false;
	// 停止标志
	let stopFlag = false;

	// f 终止任务
	function stop() {
		// console.log("终止任务");
		stopFlag = true;
	}

	// f 运行任务
	function run() {
		return new Promise<void>((resolve) => {
			if (tasks.length === 0) {
				// console.log("任务为空");
				options?.onAllTasksComplete?.(finishedCount, failedCount);
				resolve();
				return;
			}

			// f 运行下一个任务
			function runNext() {
				// 记录当前任务索引
				const currentIndex = nextIndex;
				// 拿到下一个任务
				const task = tasks[currentIndex] as Task<T>;
				// 任务索引 +1
				nextIndex = currentIndex + 1;

				// 执行任务
				task
					.handle()
					.then((res) => {
						// 完成任务数加一
						finishedCount++;

						// 触发任务完成回调
						options?.onTaskComplete?.(currentIndex, res, finishedCount, stop);

						if (stopFlag) {
							// 触发任务终止回调
							options?.onAllTasksComplete?.(finishedCount, failedCount);
							resolve();
							return;
						}

						// 运行下一个任务 （任务索引 < 任务总数）
						if (nextIndex < tasks.length) {
							runNext();
						} else if (finishedCount === tasks.length) {
							// 触发所有任务完成回调 （任务索引 >= 任务总数）
							options?.onAllTasksComplete?.(finishedCount, failedCount);
							resolve();
						}
					})
					.catch((error) => {
						// 错误任务数加一
						failedCount++;
						// 触发任务失败回调
						options?.onTaskError?.(currentIndex, error, task);
					});
			}

			// ? 启动并行队列
			for (
				let index = 0;
				index < parallelCount && index < tasks.length;
				index++
			) {
				runNext();
			}
		});
	}

	return {
		run,
		pause,
		stop,
	};
}
