// createContextMenu.js
import {
	createApp,
	onActivated,
	onDeactivated,
	onMounted,
	onUnmounted,
	reactive,
	ref,
} from "vue";
import type { ComputedRef, Ref } from "vue";
import ContextMenu from "./base-context-menu.vue";
import { unrefElement } from "@vueuse/core";

// t 可能的 HTMLElement 类型
type MaybeHTMLElementRef =
	| Ref<HTMLElement | null>
	| ComputedRef<HTMLElement | null>
	| Parameters<typeof unrefElement<HTMLElement | null | undefined>>[0];

// t 定义菜单项配置
type BaseContextMenuOptions = {
	root?: MaybeHTMLElementRef;
};

/**
 * 动态创建并返回一个用于显示右键菜单的函数。
 *  @returns  showContextMenu(event, options) 函数
 */
export function useBaseContextMenu(options?: BaseContextMenuOptions) {
	// 1. 创建一个临时的 DOM 容器
	const container = document.createElement("div");
	// s 目标元素DOM
	const rootDOM = ref<HTMLElement | undefined>();

	const state = reactive({
		isMounted: false,
	});

	let menuApp: ReturnType<typeof createApp> | undefined;
	let instance: InstanceType<typeof ContextMenu>;

	// w 组件挂载后进行初始化
	onMounted(() => {
		init();
		state.isMounted = true;
	});

	// w 组件冻结时销毁右键菜单组件
	onDeactivated(() => destroy());

	// w 组件激活时重新初始化右键菜单组件
	onActivated(() => {
		if (!state.isMounted) return;
		init();
	});

	// f 初始化函数
	function init() {
		// 销毁上一次创建的组件
		destroy();
		// 获取root元素
		rootDOM.value = unrefElement(options?.root) || document.body;
		// 重新添加到root元素中
		rootDOM.value.appendChild(container);
		// 创建 Vue App 实例
		menuApp = createApp(ContextMenu);
		// 挂载组件
		instance = menuApp.mount(container) as InstanceType<typeof ContextMenu>;
	}

	// f 销毁函数
	function destroy() {
		// 销毁组件
		menuApp?.unmount();
		if (container.isConnected) {
			rootDOM.value?.removeChild(container);
		}
	}

	// w 组件销毁时销毁组件
	onUnmounted(() => destroy());

	/**
	 * f 显示菜单并等待用户选择
	 * @param  event - 触发右键菜单的事件
	 * @param options - 菜单项配置 { label: string, command: string }
	 * @returns  返回选中的 command 或 null
	 */
	async function showContextMenu<T>(
		event: PointerEvent,
		options: Array<MenuOption<T>>
	) {
		try {
			// 调用组件实例内部的 showMenu 方法
			const command = await instance.showMenu(event, options);
			return command;
		} catch (e) {
			console.error("显示上下文菜单时出错：", e);
			return null;
		}
	}

	return { showContextMenu, init };
}
