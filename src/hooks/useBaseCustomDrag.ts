import { unrefElement } from "@vueuse/core";
import type { ComputedRef, Ref } from "vue";
import { onMounted, onUnmounted, reactive, readonly, ref } from "vue";

// t 位置类型
type Pos = { x: number; y: number };

// t 可能的 HTMLElement 类型
type MaybeHTMLElementRef =
	| Ref<HTMLElement | null>
	| ComputedRef<HTMLElement | null>
	| Parameters<typeof unrefElement<HTMLElement | null | undefined>>[0];

// t 自定义拖拽元素选项
type BaseCustomDragOptions = {
	/** 要克隆的元素 @default undefined (默认会使用目标元素的克隆，除非指定该选项) */
	cloneDOM?: MaybeHTMLElementRef;
	/** 拖拽开始的最小距离 @default 4 */
	threshold?: number;
	/** 幽灵元素位置相对于鼠标指针位置的偏移量计算方式
	 * @default
	 * { x: 'center', y: 'center' }
	 */
	ghostOffsetMethod?: {
		x?: "center" | "auto";
		y?: "center" | "auto";
	};
	/** 拖拽开始时的回调函数 (触发条件：当前按下鼠标到触发元素的最小距离小于阈值，此时元素刚刚加入到body中，可以先对元素进行一些初始化操作) */
	onDragStart?: (
		startPos: Pos,
		event: PointerEvent,
		ghostDOM: HTMLElement | null,
	) => void;
	/** 拖拽移动的回调函数 (触发条件：拖拽状态下，鼠标指针移动) */
	onDragMove?: (
		pos: Pos,
		event: PointerEvent,
		ghostDOM: HTMLElement | null,
	) => void;
	/** 拖拽结束的回调函数 (触发条件：处于拖拽状态时候，鼠标松开; 提示：该函数支持异步) */
	onDrop?: (
		endPos: Pos,
		event: PointerEvent,
		ghostDOM: HTMLElement | null,
	) => Promise<void> | void;
};

/**
 * f 自定义拖拽元素 hook
 * @param target 目标元素
 * @param options 选项
 * @returns
 */
export function useCustomDrag(
	target: MaybeHTMLElementRef,
	options: BaseCustomDragOptions = {},
) {
	// s 指针已按下
	const pressed = ref(false);
	// s 拖拽状态
	const dragging = ref(false);
	// s 移动阈值
	const threshold = options.threshold || 4;

	// s 指针起始位置
	const pointerStartPos = reactive<Pos>({ x: 0, y: 0 });
	// s 元素起始位置
	const targetStartPos = reactive<Pos>({ x: 0, y: 0 });
	// s 幽灵元素位置
	const ghostPos = reactive<Pos>({ x: 0, y: 0 });
	// s pointer起始位置与目标元素的位置偏移量百分比
	const offsetPercent = reactive<Pos>({ x: 0, y: 0 });

	// s 目标元素DOM
	const targetDOM = ref<HTMLElement | null | undefined>(null);
	// s 幽灵元素DOM
	const ghostDOM = ref<HTMLElement | null>(null);

	// s 禁用标识符
	const disable = ref(false);

	onMounted(() => {
		init();
	});

	// f 初始化函数
	function init() {
		if (!target) return;
		targetDOM.value = unrefElement(target);
		if (!targetDOM.value) return; // throw new Error('[useCustomDrag:onMounted] 目标元素不存在')
		targetDOM.value.addEventListener("pointerdown", onPointerDown);
	}

	// f 初始化幽灵元素
	function initGhost() {
		if (!targetDOM.value) return;

		if (options.cloneDOM) {
			// 如果指定了克隆元素，则克隆该元素
			const cloneDOM = unrefElement(options.cloneDOM);
			if (!cloneDOM) return; // throw new Error('[useCustomDrag:initGhost] 未找到cloneDOM对应的元素')
			ghostDOM.value = cloneDOM.cloneNode(true) as HTMLElement;
		} else {
			// 如果未指定克隆元素，则直接克隆目标元素
			ghostDOM.value = targetDOM.value.cloneNode(true) as HTMLElement;
		}
		if (!ghostDOM.value) return; // throw new Error('[useCustomDrag:initGhost] 克隆目标元素失败')

		// 移除 ID 以防止页面出现重复 ID
		ghostDOM.value.removeAttribute("id");
		ghostDOM.value.style.position = "fixed";
		ghostDOM.value.style.transform = "translate3d(0, 0, 0)";
		ghostDOM.value.style.top = "0";
		ghostDOM.value.style.left = "0";
		ghostDOM.value.style.width = "";
		ghostDOM.value.style.height = "";
		ghostDOM.value.style.transition = "";
		ghostDOM.value.style.opacity = "0";
		ghostDOM.value.style.pointerEvents = "none";
		ghostDOM.value.style.userSelect = "none";
	}

	// f 拖拽开始
	function onPointerDown(e: PointerEvent) {
		if (disable.value) return;
		if (!targetDOM.value) return; // throw new Error('[useCustomDrag:onPointerDown] 目标元素不存在')
		initGhost();
		if (!ghostDOM.value) return; // throw new Error('[useCustomDrag:onPointerDown] 幽灵元素不存在')

		// 只有鼠标左键生效
		if (e.button !== 0) return;

		// 获取目标元素的位置信息
		const rect = targetDOM.value.getBoundingClientRect();
		if (!rect) return;

		// 设置幽灵节点的初始位置
		ghostDOM.value.style.top = `${rect.top}px`;
		ghostDOM.value.style.left = `${rect.left}px`;
		// 默认设置幽灵元素的宽度和高度于目标元素相同
		ghostDOM.value.style.width = `${rect.width}px`;
		ghostDOM.value.style.height = `${rect.height}px`;

		// 计算偏移量
		const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };

		// 计算偏移量百分比
		offsetPercent.x = offset.x / rect.width;
		offsetPercent.y = offset.y / rect.height;

		// 记录事件的起始位置
		pointerStartPos.x = e.clientX;
		pointerStartPos.y = e.clientY;

		// 记录目标元素的起始位置
		targetStartPos.x = rect.left;
		targetStartPos.y = rect.top;

		// 标记为按下
		pressed.value = true;

		// 初始化拖拽标记
		dragging.value = false;

		// 注册移动事件
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}

	// f 移动中的回调
	const onMove = (e: PointerEvent) => {
		if (!ghostDOM.value) return; // throw new Error('[useCustomDrag:onMove] 找不到幽灵元素')

		// 计算移动距离
		const dx = e.clientX - pointerStartPos.x;
		const dy = e.clientY - pointerStartPos.y;

		// 移动超过阈值才认为是拖拽
		if (
			pressed.value &&
			!dragging.value &&
			Math.abs(dx) + Math.abs(dy) > threshold
		) {
			dragging.value = true;
			document.body.appendChild(ghostDOM.value);
			options.onDragStart?.(targetStartPos, e, ghostDOM.value);
		}

		// 如果是拖拽状态，更新实时位置和幽灵样式
		if (dragging.value) {
			// 计算位置
			// 默认计算方式是让 ghost 元素始终在鼠标指针的中间位置
			const nowPos = {
				x: e.clientX - targetStartPos.x - 0.5 * ghostDOM.value.offsetWidth,
				y: e.clientY - targetStartPos.y - 0.5 * ghostDOM.value.offsetHeight,
			};

			if (options.ghostOffsetMethod) {
				// 水平方向的定位方式
				if (options.ghostOffsetMethod.x === "auto") {
					// 按照起始位置相对目标元素的百分比位置计算
					nowPos.x =
						e.clientX -
						targetStartPos.x -
						offsetPercent.x * ghostDOM.value.offsetWidth;
				}
				// 垂直方向的定位方式
				if (options.ghostOffsetMethod.y === "auto") {
					// 按照起始位置相对目标元素的百分比位置计算
					nowPos.y =
						e.clientY -
						targetStartPos.y -
						offsetPercent.y * ghostDOM.value.offsetHeight;
				}
			}

			// 更新实时位置
			ghostPos.x = nowPos.x;
			ghostPos.y = nowPos.y;
			options.onDragMove?.(ghostPos, e, ghostDOM.value);
			// 更新幽灵样式
			ghostDOM.value.style.transform = `translate3d(${ghostPos.x}px, ${ghostPos.y}px, 0)`;
			ghostDOM.value.style.opacity = "1";
			ghostDOM.value.style.zIndex = "2147483647";
			ghostDOM.value.style.pointerEvents = "none";
		}
	};

	// f 松开时的回调
	const onUp = async (e: PointerEvent) => {
		if (!ghostDOM.value) return; // throw new Error('[useCustomDrag:onUp] 找不到幽灵元素')
		// 清除事件监听
		cleanup();
		// 如果是拖拽状态，才执行回调
		if (dragging.value) {
			await options.onDrop?.(ghostPos, e, ghostDOM.value);
		}
		// 隐藏幽灵元素
		ghostDOM.value.style.opacity = "0";
		ghostDOM.value.style.zIndex = "-2147483647";
		// 移除幽灵元素 （如果还在DOM中）
		if (ghostDOM.value.isConnected) document.body.removeChild(ghostDOM.value);
		// 标记为拖拽结束
		pressed.value = false;
	};

	// f 监听器清理函数
	const cleanup = () => {
		// 清除事件监听
		window.removeEventListener("pointermove", onMove);
		window.removeEventListener("pointerup", onUp);
	};

	// 组件销毁时清除事件监听
	onUnmounted(() => {
		cleanup();
	});

	return {
		/** 是否正在拖拽 */
		dragging: readonly(dragging),
		/** 幽灵元素位置 */
		ghostPos: readonly(ghostPos),
		/** 禁用状态 (可修改) */
		disable,
		/** 初始化 (可进行重新初始化是否禁用状态) */
		init,
	};
}

