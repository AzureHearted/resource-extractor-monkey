interface Options<T> {
  interval: number; // 每次调度间隔
  maxConcurrent: number; // 最大并发数
  overtime: number; // 超时时间
  onTaskComplete: (result: T, completedCount: number, stop: () => void) => void;
  onTaskError: (error: any, task: Task<T>) => void;
  onTaskOvertime: (task: Task<T>, overtimeTasks: Task<T>[]) => void;
  onAllTasksComplete: (completedCount: number, failedCount: number) => void;
}

export interface Task<T> {
  handle: () => Promise<T>; // 任务主体
  handleOvertime?: () => Promise<any>; // 超时处理
  _overtimeTimer?: any; // 超时定时器（内部使用）
  complete?: boolean; // 是否已完成（内部使用）
  isOvertime?: boolean; // 是否曾触发超时（内部使用）
  [key: string]: any; // 扩展字段
}

export class TaskQueue<T = any> {
  private tasks: Task<T>[] = []; // 任务队列
  private running = false; // 是否正在运行
  private stopped = false; // 是否被彻底终止（新增）
  private paused = false; // 是否暂停

  private interval: number;
  private overtime: number;
  private maxConcurrent: number;
  private currentConcurrent = 0; // 当前并发数

  private completedCount = 0;
  private failedTasks: Task<T>[] = [];
  private overtimeTasks: Task<T>[] = [];

  private isComplete = false; // 是否完成所有任务
  private timer: any = null; // 调度定时器
  private runningTasks: Promise<T>[] = []; // 当前正在执行的 Promise 列表

  private onTaskComplete: Options<T>["onTaskComplete"];
  private onTaskError: Options<T>["onTaskError"];
  private onTaskOvertime: Options<T>["onTaskOvertime"];
  private onAllTasksComplete: Options<T>["onAllTasksComplete"];

  constructor(options?: Partial<Options<T>>) {
    const defaults: Options<T> = {
      interval: 300,
      overtime: 5000,
      maxConcurrent: 1,
      onTaskComplete: () => {},
      onTaskError: () => {},
      onTaskOvertime: () => {},
      onAllTasksComplete: () => {},
    };

    const opts = { ...defaults, ...options };
    this.interval = opts.interval;
    this.overtime = opts.overtime;
    this.maxConcurrent = opts.maxConcurrent;

    this.onTaskComplete = opts.onTaskComplete;
    this.onTaskError = opts.onTaskError;
    this.onTaskOvertime = opts.onTaskOvertime;
    this.onAllTasksComplete = opts.onAllTasksComplete;
  }

  /** 添加任务，可以是单个或数组 */
  public addTask(task: Task<T> | Task<T>[]): void {
    if (Array.isArray(task)) {
      this.tasks.push(...task);
    } else {
      this.tasks.push(task);
    }
  }

  /** 主启动方法：调度第一次任务执行 */
  public run(): void {
    if (this.stopped) return; // stop 后彻底禁止
    if (this.paused) return;

    // 第一次运行，把 running 置 true
    if (!this.running) {
      this.running = true;
      this.handleRun();
      return;
    }

    // 已经在运行，则根据 interval 延迟调度
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.timer = setTimeout(() => {
      if (this.stopped || this.paused) return; // stop 或 pause 后中断
      // console.log("Task轮询中……")
      this.handleRun();
    }, this.interval);
  }

  /** 调度逻辑：控制并发数 */
  private handleRun(): void {
    if (this.stopped || this.paused || !this.running) return;

    while (this.currentConcurrent < this.maxConcurrent) {
      this.currentConcurrent++;
      this.executeTask();
    }
  }

  /** 核心：执行单个任务 */
  private async executeTask(): Promise<void> {
    if (this.stopped) return; // stop 后不再调度
    if (!this.running) return;

    // 若无任务，主动停止
    if (!this.tasks.length) {
      this.stop();
      return;
    }

    const task = this.tasks.shift()!;
    task.complete = false;
    task.isOvertime = false;

    /** 内部函数：执行完一个任务后的调度 */
    const accomplish = () => {
      if (this.stopped) return; // ★ 停止后不调度

      if (!this.tasks.length) {
        this.stop();
      } else {
        this.run();
      }
    };

    /** 超时处理 */
    if (this.overtime > 0) {
      task._overtimeTimer = setTimeout(() => {
        if (this.stopped) return; // ★ 停止后中断超时逻辑
        if (task.complete) return;

        task.isOvertime = true;
        this.overtimeTasks.push(task);

        this.onTaskOvertime(task, this.overtimeTasks);

        this.currentConcurrent--;
        accomplish();
      }, this.overtime);
    }

    /** 执行真正任务 */
    try {
      const p = task.handle();

      // 记录 Promise 以便 stop() 清空
      this.runningTasks.push(p);
      p.finally(() => {
        const idx = this.runningTasks.indexOf(p);
        if (idx >= 0) this.runningTasks.splice(idx, 1);
      });

      const result = await p;
      if (!this.stopped)
        this.onTaskComplete(result, this.completedCount, () => this.stop());
    } catch (error) {
      if (!this.stopped) this.onTaskError(error, task);

      this.failedTasks.push(task);
    }

    task.complete = true;
    clearTimeout(task._overtimeTimer);

    if (!task.isOvertime) {
      this.currentConcurrent--;
      accomplish();
    }

    this.completedCount++;
  }

  /** 暂停 */
  public pause(): void {
    if (!this.running || this.stopped) return;
    this.paused = true;
  }

  /** 恢复 */
  public continue(): void {
    if (this.stopped) return;
    if (!this.paused) return;

    this.paused = false;
    this.run();
  }

  /** ★★★ 彻底停止队列（你真正想要的行为） */
  public stop(): void {
    if (this.stopped) return;

    this.stopped = true;
    this.running = false;
    this.paused = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.overtimeTasks.forEach((t) => {
      if (t._overtimeTimer) clearTimeout(t._overtimeTimer);
    });

    this.runningTasks = [];

    this.handleComplete();
  }

  /** 所有任务结束时触发 */
  private handleComplete(): void {
    if (this.isComplete) return;

    this.isComplete = true;
    this.onAllTasksComplete(this.completedCount, this.failedTasks.length);
  }
}
