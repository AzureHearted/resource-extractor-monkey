<template>
	<div
		class="base-context-menu__overlay"
		@click.self="hideMenu"
		@contextmenu.prevent
	>
		<div
			ref="contextMenuDOM"
			class="base-context-menu__menu"
			:class="{
				show: state.isVisible,
			}"
		>
			<template v-for="(item, index) in state.options" :key="index">
				<div
					v-show="!item.hidden"
					class="base-context-menu__item"
					:data-disable="item.disable"
					@click="handleItemClick($event, index)"
				>
					{{ item.label }}
				</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { onClickOutside } from "@vueuse/core";
import { shallowReactive, useTemplateRef } from "vue";

const props = withDefaults(
	defineProps<{
		/** 字体大小 @default 14 */
		fontSize?: number;
	}>(),
	{
		fontSize: 14,
	}
);

const contextMenuDOM = useTemplateRef("contextMenuDOM");

// 状态数据
const state = shallowReactive({
	isVisible: false,
	transitioning: false,
	options: [] as Array<MenuOption>,
});

let resolveAction: Function | null = null; // 用于存储 Promise 的 resolve 函数

/**
 * 外部调用的显示菜单函数
 * @param event - 鼠标右键事件对象
 * @param  menuOptions - 菜单项配置
 * @returns  返回一个 Promise，成功时返回选中的 command
 */
/**
 * 外部调用的显示菜单函数 (优化后)
 */
function showMenu<T>(
	e: PointerEvent,
	menuOptions: Array<MenuOption<T>>
): Promise<T | null> {
	// 阻止默认右键菜单
	e.preventDefault();

	// 显示菜单
	return new Promise(async (resolve) => {
		// 记录菜单项
		state.options = menuOptions;
		// 存储 resolve 函数
		resolveAction = resolve;
		state.isVisible = true;
		// 执行flip动画
		handleShow(e);
	});
}

// f 显示菜单的flip动画函数
function handleShow(e: PointerEvent) {
	const menuDOM = contextMenuDOM.value; // 确保这是一个非 null 的 Ref<HTMLElement>
	if (!menuDOM) return;

	const position = { x: e.clientX, y: e.clientY };
	// 记录起始位置
	menuDOM.style.left = `${position.x}px`;
	menuDOM.style.top = `${position.y}px`;

	const startPos = { ...position };

	requestAnimationFrame(() => {
		// 重新计算位置
		const { offsetWidth, offsetHeight } = menuDOM;

		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		// 防止溢出
		if (position.y + offsetHeight > windowHeight - 16) {
			// 计算需要上移的距离，将菜单顶部与新的 Y 坐标对齐
			position.y = windowHeight - 16 - offsetHeight;
		}

		if (position.x + offsetWidth > windowWidth - 16) {
			// 计算需要左移的距离
			position.x = windowWidth - 16 - offsetWidth;
		}

		// 计算差值
		const diffX = position.x - startPos.x;
		const diffY = position.y - startPos.y;

		// 设置动画起始位置
		menuDOM.style.left = `${position.x}px`;
		menuDOM.style.top = `${position.y}px`;
		menuDOM.style.transform = `translate(${-diffX}px,${-diffY}px) scale(0.8)`;

		requestAnimationFrame(() => {
			// 动画最终位置
			menuDOM.style.transition = "0.2s ease";
			menuDOM.style.removeProperty("transform");
			state.transitioning = true;
			const finished = (e: TransitionEvent) => {
				if (e.target !== menuDOM) return;
				state.transitioning = false;
				menuDOM.style.removeProperty("transition");
				menuDOM.removeEventListener("transitionend", finished);
			};

			menuDOM.addEventListener("transitionend", finished);
		});
	});
}

// 点击菜单外面区域时隐藏菜单
onClickOutside(contextMenuDOM, (_e) => {
	if (state.isVisible) hideMenu();
});

// 隐藏菜单
async function hideMenu() {
	// 如果菜单被隐藏，但 Promise 还没解决，则解决为 null
	if (resolveAction) {
		resolveAction(null);
		resolveAction = null;
	}
	handleHide();
}

// f 隐藏菜单的flip动画函数
async function handleHide() {
	const menuDOM = contextMenuDOM.value;
	if (!menuDOM) return;
	return new Promise(() => {
		menuDOM.style.opacity = "1";
		menuDOM.style.transform = `scale(1)`;
		requestAnimationFrame(() => {
			menuDOM.style.transition = "0.25s ease, opacity 0.25s ease";
			menuDOM.style.opacity = "0";
			menuDOM.style.transform = `scale(0.8)`;

			const finished = (e: TransitionEvent) => {
				if (e.target !== menuDOM) return;
				menuDOM.style.removeProperty("transition");
				menuDOM.style.removeProperty("transform");
				menuDOM.style.removeProperty("opacity");
				menuDOM.removeEventListener("transitionend", finished);
			};

			state.isVisible = false;

			menuDOM.addEventListener("transitionend", finished);
		});
	});
}

// 点击菜单项时触发
function handleItemClick(event: PointerEvent, index: number) {
	if (!event.target) return;
	const option = state.options[index];
	const { command, disable } = option;
	if (disable) return;
	if (command && resolveAction) {
		resolveAction(command); // 解决 Promise，返回选中的命令
		hideMenu();
	}
}

// 暴露 showMenu 方法供外部调用
defineExpose({
	showMenu,
});
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}
/* 菜单容器，覆盖全屏，用于点击隐藏 */
.base-context-menu__overlay {
	/* 默认隐藏 */
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 1000; /* 确保菜单在最上层 */
	pointer-events: none; /* 禁止点击 */
}

/* 菜单本体 */
.base-context-menu__menu {
	font-size: calc(v-bind("fontSize") * 1px);
	position: absolute; /* 绝对定位，由 JS 设置 x, y */
	list-style: none;
	padding: 0.15em;
	margin: 0;
	min-width: 150px;
	border-radius: 4px;

	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);

	user-select: none;

	visibility: hidden;
	transition: background 0.5s ease, border 0.5s ease, box-shadow 0.5s ease;

	&.show {
		visibility: visible;
		pointer-events: all;
	}

	/* 菜单背景 */
	&::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;

		background: hsla(0, 0%, 100%, 0.75);
		border: 1px solid hsla(210, 100%, 50%, 0.5);

		/* 核心：模糊背后的内容 */
		backdrop-filter: blur(4px) saturate(120%);
		-webkit-backdrop-filter: blur(4px) saturate(120%);
		z-index: -1;
	}
}

/* 菜单项 */
.base-context-menu__item {
	padding: 0.5em 0.75em;
	cursor: pointer;
	white-space: nowrap;
	color: black;
	border-radius: 2px;

	transition: 0.3s;
	transition-property: color, background;

	&:hover {
		color: white;
		background-color: hsla(210, 100%, 50%, 0.8);
	}

	/* 禁用时的样式 */
	&[data-disable="true"] {
		cursor: not-allowed;
		color: hsla(0, 0%, 60%, 0.75);
		&:hover {
			background-color: unset;
		}
	}
}

/** 暗黑模式样式 */
@media (prefers-color-scheme: dark) {
	.base-context-menu__menu {
		&::before {
			background-color: hsla(0, 0%, 16%, 0.75);
			border: 1px solid hsla(0, 0%, 80%, 0.5);
		}
	}
	.base-context-menu__item {
		color: white;
	}
}
</style>
