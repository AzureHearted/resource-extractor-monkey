<template>
	<div class="base-tree__node-label" :data-selected="selected">
		<div
			ref="iconRef"
			class="base-tree__node-icon"
			:data-show="!isLeaf"
			:data-expanded="expanded"
			:class="{ loading }"
			@click="onClickIcon"
			@dblclick="onDblclickIcon"
			@contextmenu="onContextMenuIcon"
		>
			<!-- 默认图标 -->
			<template v-if="!loading">
				<svg
					v-if="
						(expanded && !$slots['expand-icon']?.()) ||
						(!expanded && !$slots['collapse-icon']?.())
					"
					data-default-icon
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="M10 17.75a.74.74 0 0 1-.53-.22a.75.75 0 0 1 0-1.06L13.94 12L9.47 7.53a.75.75 0 0 1 1.06-1.06l5 5a.75.75 0 0 1 0 1.06l-5 5a.74.74 0 0 1-.53.22"
					/>
				</svg>
				<template v-if="!expanded">
					<slot name="collapse-icon"> </slot>
				</template>
				<template v-else>
					<slot name="expand-icon"> </slot>
				</template>
			</template>
			<!-- 加载时的图标 -->
			<template v-else>
				<slot name="loading-icon">
					<svg
						data-default-icon
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
					>
						<path
							fill="currentColor"
							d="M12 21a9 9 0 1 1 6.18-15.55a.75.75 0 0 1 0 1.06a.74.74 0 0 1-1.06 0A7.51 7.51 0 1 0 19.5 12a.75.75 0 0 1 1.5 0a9 9 0 0 1-9 9"
						/>
					</svg>
				</slot>
			</template>
		</div>
		<div
			ref="labelRef"
			class="base-tree__node-label__content"
			:title="label"
			:data-dragover-state="dragoverState"
			@click.prevent="onClick"
			@dblclick="onDblclick"
			@contextmenu="onContextMenu"
			tabindex="0"
		>
			<!-- 标签内容区左侧 -->
			<div
				class="base-tree__node-label__content-left"
				ref="labelContentLeftRef"
			>
				<slot>
					<BaseHighlightText :text="label" :keyword="highlightKeyword">
					</BaseHighlightText>
				</slot>
			</div>
			<!-- 标签内容区右侧 (操作按钮区域) -->
			<div
				class="base-tree__node-label__content-right"
				ref="labelContentRightRef"
				@pointerdown.stop
				@contextmenu.stop
			>
				<slot name="buttons">
					<div
						v-if="showAddButton"
						class="base-tree__button base-tree__button__add"
						@click.stop.prevent="onAdd"
						@dblclick.stop.prevent
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M9.367 2.25c-1.092 0-1.958 0-2.655.057c-.714.058-1.317.18-1.868.46a4.75 4.75 0 0 0-2.076 2.077c-.281.55-.403 1.154-.461 1.868c-.057.697-.057 1.563-.057 2.655v5.266c0 1.092 0 1.958.057 2.655c.058.714.18 1.317.46 1.869a4.75 4.75 0 0 0 2.077 2.075c.55.281 1.154.403 1.868.461c.697.057 1.563.057 2.655.057h5.266c1.092 0 1.958 0 2.655-.057c.714-.058 1.317-.18 1.869-.46a4.75 4.75 0 0 0 2.075-2.076c.281-.552.403-1.155.461-1.869c.057-.697.057-1.563.057-2.655V9.367c0-1.092 0-1.958-.057-2.655c-.058-.714-.18-1.317-.46-1.868a4.75 4.75 0 0 0-2.076-2.076c-.552-.281-1.155-.403-1.869-.461c-.697-.057-1.563-.057-2.655-.057zM12 7.75a.75.75 0 0 1 .75.75v2.75h2.75a.75.75 0 0 1 0 1.5h-2.75v2.75a.75.75 0 0 1-1.5 0v-2.75H8.5a.75.75 0 0 1 0-1.5h2.75V8.5a.75.75 0 0 1 .75-.75"
							/>
						</svg>
					</div>
					<div
						v-if="showDeleteButton"
						class="base-tree__button base-tree__button__delete"
						@click.stop.prevent="onDelete"
						@dblclick.stop.prevent
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
							<path
								fill="currentColor"
								d="M8.5 4h3a1.5 1.5 0 0 0-3 0m-1 0a2.5 2.5 0 0 1 5 0h5a.5.5 0 0 1 0 1h-1.054l-1.194 10.344A3 3 0 0 1 12.272 18H7.728a3 3 0 0 1-2.98-2.656L3.554 5H2.5a.5.5 0 0 1 0-1zM9 8a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0zm2.5-.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 1 0V8a.5.5 0 0 0-.5-.5"
							/>
						</svg>
					</div>
				</slot>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import BaseHighlightText from "../base-highlight-text.vue";

defineOptions({
	name: "base-tree-node-label",
});

const props = withDefaults(
	defineProps<{
		/** 标签文本 */
		label?: string;
		/** 是否是选中状态 */
		selected?: boolean;
		/** 是否展开 */
		expanded?: boolean;
		/** 是否处于加载状态 */
		loading?: boolean;
		/** 是否是叶子节点 */
		isLeaf?: boolean;
		/** 层级 */
		level?: number;
		/** 缩进大小 */
		indentSize?: number;
		/** 其他节点在当前节点悬浮位置的状态  */
		dragoverState?: "before" | "inside" | "after";
		/** 高亮关键词 */
		highlightKeyword?: string;
		/** 显示删除按钮 */
		showDeleteButton?: boolean;
		/** 显示添加按钮 */
		showAddButton?: boolean;
	}>(),
	{
		label: "",
		expanded: false,
		loading: false,
		isLeaf: false,
		indentSize: 16,
		level: 0,
	},
);

const emits = defineEmits<{
	click: [e: MouseEvent];
	dblclick: [e: MouseEvent];
	"dblclick-icon": [e: MouseEvent];
	"click-icon": [e: MouseEvent];
	contextmenu: [e: PointerEvent];
	"contextmenu-icon": [e: PointerEvent];
	"click-add-button": [e: MouseEvent];
	"click-delete-button": [e: MouseEvent];
}>();

const labelRef = useTemplateRef("labelRef");
const labelContentLeftRef = useTemplateRef("labelContentLeftRef");
const labelContentRightRef = useTemplateRef("labelContentRightRef");

function onClick(e: MouseEvent) {
	labelRef.value?.focus();
	if (props.loading) return;
	emits("click", e);
}

function onDblclick(e: MouseEvent) {
	labelRef.value?.focus();
	if (props.loading) return;
	emits("dblclick", e);
}

function onDblclickIcon(e: MouseEvent) {
	labelRef.value?.focus();
	if (props.loading) return;
	emits("dblclick-icon", e);
}

function onClickIcon(e: MouseEvent) {
	if (props.loading) return;
	emits("click-icon", e);
}

function onContextMenu(e: PointerEvent) {
	labelRef.value?.focus();
	if (props.loading) return;
	emits("contextmenu", e);
}

function onContextMenuIcon(e: PointerEvent) {
	if (props.loading) return;
	emits("contextmenu-icon", e);
}

function onAdd(e: MouseEvent) {
	if (props.loading) return;
	emits("click-add-button", e);
}

function onDelete(e: MouseEvent) {
	if (props.loading) return;
	emits("click-delete-button", e);
}

defineExpose({
	labelRef,
	labelContentLeftRef,
	labelContentRightRef,
});
</script>

<style lang="scss" scoped>
$indent-size: calc(v-bind("props.indentSize") * v-bind("props.level"));

.base-tree__node-label {
	position: relative;
	display: flex;
	align-items: center;

	padding: 0 4px;
	padding-left: calc($indent-size * 1px + 4px);
	gap: 4px;

	/* 节点内容样式 */
	.base-tree__node-label__content {
		position: relative;
		flex-grow: 1;
		display: flex;
		align-items: center;
		overflow: hidden;
		border-radius: 4px;
		left: 0;
		right: 4px;

		transition: background 0.5s ease;

		/* 鼠标悬停、按下、聚焦样式 */
		&:hover,
		&:active,
		&:focus {
			background-color: hsl(210, 44%, 90%);
			@media (prefers-color-scheme: dark) {
				background-color: hsl(240, 4%, 28%);
			}
		}

		&-left {
			padding: 6px 4px;
			color: black;

			user-select: none;
			cursor: pointer;

			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			/** 暗黑模式样式 */
			@media (prefers-color-scheme: dark) {
				color: #fff;
			}
		}

		&-right {
			margin-left: auto;
			margin-right: 16px;

			display: flex;
			align-items: center;
			gap: 4px;

			.base-tree__button {
				display: flex;
				align-items: center;

				svg {
					width: 1.2em;
					transform: scale(1.2);
					cursor: pointer;
				}

				&__add svg {
					color: hsl(120, 100%, 35%);
				}
				&__delete svg {
					color: hsl(0, 100%, 40%);
				}
			}
		}

		&::after {
			position: absolute;
			content: "";
			pointer-events: none;
			left: 0;
			right: 0;
			background-color: #096fd5;
			z-index: 1;
		}

		&[data-dragover-state="before"]::after {
			top: 0;
			height: 2px;
		}

		&[data-dragover-state="inside"] {
			background: hsla(210, 92%, 44%, 0.5);
		}

		&[data-dragover-state="after"]::after {
			bottom: 0;
			height: 2px;
		}
	}

	/* 图标样式 */
	.base-tree__node-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		overflow: hidden;
		padding: 2px;
		border-radius: 50%;

		user-select: none;
		cursor: pointer;

		transition:
			color 0.5s ease,
			background 0.5s ease,
			transform 0.3s ease;

		&:hover {
			background-color: #ccc;

			/** 暗黑模式样式 */
			@media (prefers-color-scheme: dark) {
				background-color: hsl(0, 0%, 30%);
			}
		}

		svg[data-default-icon] {
			width: 1.2em;
			transform: scale(1.5);
		}

		&[data-show="false"] {
			opacity: 0;
			pointer-events: none;
		}

		&[data-expanded="true"]:has(svg[data-default-icon]) {
			transform: rotate(90deg);
		}

		/* 加载状态的样式 */
		&.loading {
			&:has(svg[data-default-icon]) {
				/* 加载动画 */
				animation: spin 0.5s linear infinite;
			}

			/* 微调svg大小 */
			svg[data-default-icon] {
				transform: scale(1.2);
				color: hsla(210, 100%, 50%, 0.8);
				/** 暗黑模式样式 */
				@media (prefers-color-scheme: dark) {
					color: hsl(192, 100%, 50%, 0.8);
				}
			}

			&[data-expanded="true"]:has(svg[data-default-icon]) {
				transform: rotate(0);
			}
		}
	}
}

/* 选中时的样式 */
.base-tree__node-label[data-selected="true"] {
	& > .base-tree__node-label__content {
		background: hsla(210, 92%, 44%, 0.8);

		&:hover,
		&:active,
		&:focus {
			background: hsla(210, 92%, 44%, 1);
		}

		.base-tree__node-label__content-left {
			color: #fff;
		}
	}
}

/* 旋转动画 */
@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
