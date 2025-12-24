export interface Task<T> {
	handle: () => Promise<T>; // 任务主体
}

interface Options<T> {
	/** 最大并发数 */
	parallelCount: number;
	onTaskComplete: (result: T, completedCount: number, stop: () => void) => void;
	onTaskError: (error: any, task: Task<T>) => void;
	onTaskOvertime: (task: Task<T>, overtimeTasks: Task<T>[]) => void;
	onAllTasksComplete: (completedCount: number, failedCount: number) => void;
}

export function useParallelTask<T = any>(
	tasks: Task<T>[],
	options?: Partial<Options<T>>
) {
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

	function stop() {
		console.log("终止任务");
		stopFlag = true;
	}

	// 运行任务
	function run() {
		return new Promise<void>((resolve) => {
			if (tasks.length === 0) {
				// console.log("任务为空");
				options?.onAllTasksComplete?.(finishedCount, failedCount);
				resolve();
				return;
			}

			function _run() {
				// 运行下一个任务
				const task = tasks[nextIndex] as Task<T>;
				nextIndex++;

				task
					.handle()
					.then((res) => {
						finishedCount++;
						options?.onTaskComplete?.(res, finishedCount, () => {});
						if (stopFlag) {
							// 任务终止
							options?.onAllTasksComplete?.(finishedCount, failedCount);
							resolve();
							return;
						}
						// 运行下一个任务
						if (nextIndex < tasks.length) {
							_run();
						} else if (finishedCount === tasks.length) {
							// 任务完成
							options?.onAllTasksComplete?.(finishedCount, failedCount);
							resolve();
						}
					})
					.catch((error) => {
						failedCount++;
						options?.onTaskError?.(error, task);
					});
			}

			for (
				let index = 0;
				index < parallelCount && index < tasks.length;
				index++
			) {
				_run();
			}
		});
	}

	return {
		run,
		pause,
		stop,
	};
}
