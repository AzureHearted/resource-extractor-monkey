import {
	onMounted,
	onUnmounted,
	ref,
	watch,
	getCurrentInstance,
	isRef,
} from "vue";
import type { Directive, Ref } from "vue";

// t 波纹选项
interface RippleOptions {
	/** 动画时长 @default 600 */
	duration?: number;
	/** 波纹颜色 @default 'auto' */
	color?: string | "auto";
	/** 波纹层级 @default 0 */
	zIndex?: number;
	/** 允许在点击子元素时也触发 @default true */
	allowChildTrigger?: boolean;
}

// s 波纹样式是否已注入
let styleInjected = false;

// f 波纹样式注入
function injectRippleStyle() {
	// 防止重复注入
	if (styleInjected) return;
	styleInjected = true;

	const style = document.createElement("style");
	style.setAttribute("data-ripple-style", "");

	style.textContent = /*css*/ `
		/* 波纹样式 */
		.__ripple__ {
			position: absolute;
			border-radius: 50%;
			pointer-events: none;
			transform: scale(0);
			opacity: 0.35;
			animation: __ripple_anim__ ease-out;
		}
		/* 波纹动画 */
		@keyframes __ripple_anim__ {
			to {
				transform: scale(2.5);
				opacity: 0;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * 使用波纹效果
 * @param target 目标元素的 ref
 * @param options 配置选项
 */
export function useRipple(
	target: Ref<HTMLElement | null> | HTMLElement | null,
	options: RippleOptions = {}
) {
	// ? 注入波纹样式
	injectRippleStyle();

	const {
		duration = 600,
		color = "auto",
		zIndex = 0,
		allowChildTrigger = true,
	} = options;

	// 上下文
	const instance = getCurrentInstance();
	// s 是否禁用
	const disable = ref(false);
	// s 目标元素
	let currentEl: HTMLElement | null = null;
	// s 波纹元素列表
	const rippleDOMList = [] as HTMLSpanElement[];

	// f 指针按下事件
	const onPointerDown = (e: PointerEvent) => {
		// 只有点击自身的元素才生效
		if (!allowChildTrigger && e.target !== e.currentTarget) return;
		// 禁用状态下不生效
		if (disable.value) return;
		// 仅左键按下生效
		if (e.button !== 0) return;

		const el = currentEl;
		if (!el) return;

		// 获取元素样式
		const style = getComputedStyle(el);
		// 记录目标元素的 position 和 overflow 样式
		const oldStyle = {
			position: style.position,
			overflow: style.overflow,
		};
		// 确保目标元素先对定位
		if (style.position === "static") el.style.position = "relative";
		// 确保目标元素溢出隐藏
		if (style.overflow !== "hidden") el.style.overflow = "hidden";

		// 获取元素位置
		const rect = el.getBoundingClientRect();
		// 计算波纹大小
		const size = Math.max(rect.width, rect.height);
		// 计算波纹位置
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// 创建波纹元素
		const ripple = document.createElement("span");

		ripple.className = "__ripple__";
		ripple.style.width = ripple.style.height = `${size}px`;
		ripple.style.left = `${x - size / 2}px`;
		ripple.style.top = `${y - size / 2}px`;
		ripple.style.animationDuration = `${duration}ms`;
		ripple.style.zIndex = `${zIndex}`;

		// 设置波纹颜色
		ripple.style.backgroundColor = color === "auto" ? style.color : color;

		// 添加波纹元素到目标元素中
		el.appendChild(ripple);
		// 记录波纹元素
		rippleDOMList.push(ripple);

		// 动画结束时移除波纹元素
		ripple.addEventListener(
			"animationend",
			(_e) => {
				// 从DOM中移除
				ripple.remove();
				// 从列表中移除
				rippleDOMList.splice(rippleDOMList.indexOf(ripple), 1);
				// 如果已经没有ripple元素了，恢复样式
				if (rippleDOMList.length) return;
				// 恢复目标元素的 position 和 overflow 样式
				el.style.position = oldStyle.position;
				el.style.overflow = oldStyle.overflow;
				// console.log('已经没有ripple元素了，恢复样式')
			},
			{ once: true }
		);
	};

	// f 绑定事件
	const bind = (el: HTMLElement | null) => {
		if (!el || el === currentEl) return;
		// 解绑上一个元素的事件
		unbind();
		el.addEventListener("pointerdown", onPointerDown);
		currentEl = el;
	};

	// f 解绑事件
	const unbind = () => {
		if (!currentEl) return;
		currentEl.removeEventListener("pointerdown", onPointerDown);
		currentEl = null;
	};

	if (instance) {
		// ? 只有在 setup 环境下才注册生命周期
		// f 组件挂载时绑定事件
		onMounted(() => {
			bind(isRef(target) ? target.value : target);
		});

		if (isRef(target)) {
			// f 监听目标元素变化，绑定/解绑事件
			watch(target, (el) => {
				bind(el);
			});
		}

		// f 组件销毁时解绑事件
		onUnmounted(() => {
			unbind();
		});
	} else {
		// 非 setup 环境下，直接绑定事件
	}

	return { disable, bind, unbind };
}

// t 波纹指令的实例
type RippleInstance = ReturnType<typeof useRipple>;

// s 波纹指令的实例映射
const rippleMap = new WeakMap<HTMLElement, RippleInstance>();

/**
 * v-ripple 波纹指令
 */
export const vRipple: Directive<
	HTMLElement,
	RippleOptions & { disable?: boolean }
> = {
	mounted(el, binding) {
		const ripple = useRipple(el, {
			...(binding.value || {}),
		});

		// 👇 指令环境需要手动绑定
		ripple.bind(el);

		ripple.disable.value = binding.value?.disable || false;

		rippleMap.set(el, ripple);
	},
	updated(el, binding) {
		const instance = rippleMap.get(el);
		if (!instance) return;
		// 仅处理 disable（其余参数原则上不支持热更新）
		instance.disable.value = binding.value?.disable || false;
	},
	unmounted(el) {
		const instance = rippleMap.get(el);
		if (!instance) return;
		// 主动断开 ref，触发 useRipple 的 unbind
		instance.unbind();
		rippleMap.delete(el);
	},
};

