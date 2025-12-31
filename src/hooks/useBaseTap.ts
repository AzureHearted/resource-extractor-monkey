import type { Directive } from "vue";
import Hammer from "hammerjs";

// f 判断设备是否具有触摸功能
function isTouchCapable(): boolean {
	return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export type TapEvent = HammerInput | MouseEvent;

interface TapOptions {
	/** 事件回调函数 */
	handler?: (e: TapEvent) => void;
}

export const vDoubleTap: Directive<HTMLElement, TapOptions> = {
	mounted(el, binding) {
		const handler = binding.value?.handler;
		if (!handler) return;

		if (isTouchCapable()) {
			// ===== 移动端 / 触摸设备：Hammer.js =====
			const mc = new Hammer.Manager(el);

			// console.log("Hammer double-tap 挂载", el);

			mc.add(
				new Hammer.Tap({
					event: "double-tap",
					taps: 2,
					interval: 300,
					threshold: 9,
				})
			);

			mc.on("double-tap", (e) => {
				// console.log("Hammer 双击");
				// 双击时阻止 click 冒泡
				e.srcEvent?.preventDefault();
				e.srcEvent?.stopPropagation();
				handler(e);
			});

			(el as any).__doubleTapHammer__ = mc;
		} else {
			// ===== PC：原生 dblclick =====
			const onDblClick = (e: MouseEvent) => {
				// console.log("Native 双击");
				handler(e);
			};

			el.addEventListener("dblclick", onDblClick);

			(el as any).__doubleTapNative__ = onDblClick;
		}
	},

	unmounted(el) {
		// 清理 Hammer
		const mc = (el as any).__doubleTapHammer__;
		if (mc) {
			mc.destroy();
			delete (el as any).__doubleTapHammer__;
		}

		// 清理原生 dblclick
		const native = (el as any).__doubleTapNative__;
		if (native) {
			el.removeEventListener("dblclick", native);
			delete (el as any).__doubleTapNative__;
		}
	},
};

export const vTap: Directive<HTMLElement, TapOptions> = {
	mounted(el, binding) {
		const handler = binding.value?.handler;
		if (!handler) return;

		if (isTouchCapable()) {
			// ===== 移动端 / 触摸设备：Hammer.js =====
			const mc = new Hammer.Manager(el);

			mc.add(
				new Hammer.Tap({
					event: "tap",
					taps: 1,
					interval: 300,
					threshold: 9,
				})
			);

			mc.on("tap", (e) => {
				// 防止触发原生 click
				e.srcEvent?.preventDefault();
				e.srcEvent?.stopPropagation();
				handler(e);
			});

			(el as any).__tapHammer__ = mc;
		} else {
			// ===== PC：原生 click =====
			const onClick = (e: MouseEvent) => {
				handler(e);
			};

			el.addEventListener("click", onClick);

			(el as any).__tapNative__ = onClick;
		}
	},

	unmounted(el) {
		// 清理 Hammer
		const mc = (el as any).__tapHammer__;
		if (mc) {
			mc.destroy();
			delete (el as any).__tapHammer__;
		}

		// 清理原生 click
		const native = (el as any).__tapNative__;
		if (native) {
			el.removeEventListener("click", native);
			delete (el as any).__tapNative__;
		}
	},
};
