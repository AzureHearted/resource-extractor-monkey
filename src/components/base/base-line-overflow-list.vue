<template>
	<!-- s 组件主体 -->
	<div class="line-overflow-list__container" ref="containerDOM">
		<div class="line-overflow-list__wrap" :style="[wrapStyle]" ref="wrapDOM">
			<!-- s 列表区域 -->
			<slot name="all-content">
				<div v-for="(item, index) in list" :key="item.id">
					<slot
						:item="item"
						:index="index"
						:id="item.id"
						:openShowMore="openShowMore"
					>
						<span>{{ item.label }}</span>
					</slot>
				</div>
			</slot>
			<!-- s 溢出时显示的按钮 -->
			<div
				class="line-overflow-list__button overflow-button"
				:data-show="!!list.length"
				v-if="!!list.length"
				@click.stop="showMore = !showMore"
			>
				<n-icon>
					<icon-mdi-more-horiz />
				</n-icon>
			</div>
			<!-- s 数据为空时显示的按钮 -->
			<div
				class="line-overflow-list__button void-button"
				:data-show="!list.length"
				v-if="!list.length"
				@click.stop="showMore = !showMore"
			>
				<n-icon>
					<icon-mdi-plus />
				</n-icon>
			</div>
		</div>
		<!-- s 更多展示面板 -->
		<base-drag-dialog
			v-model:show="showMore"
			:teleport-to="modelTo"
			:header-style="{
				height: 'fit-content',
			}"
			allow-full-screen
			allow-resize
		>
			<template #header-left>
				<slot name="modal-title"></slot>
			</template>
			<base-scrollbar :offset="[-4, -4]">
				<slot name="modal-content" :showMore="showMore">
					<template v-for="(item, index) in list" :key="item.id">
						<slot
							name="more-modal-content-item"
							:item="item"
							:index="index"
							:id="item.id"
						>
							<span>{{ item.label }}</span>
						</slot>
					</template>
				</slot>
			</base-scrollbar>
			<template v-if="slots['footer']" #footer>
				<slot name="modal-footer"> </slot>
			</template>
		</base-drag-dialog>
	</div>
</template>

<script lang="ts" setup>
import { useSlots } from "vue";
import type { HTMLAttributes } from "vue";
import BaseScrollbar from "@/components/base/base-scrollbar.vue";
import BaseDragDialog from "@/components/base/base-drag-dialog.vue";

withDefaults(
	defineProps<{
		list?: {
			id: string;
			label: string;
			[key: string]: any;
		}[];
		title?: string;
		wrapStyle?: HTMLAttributes["style"];
		modelTo?: string;
	}>(),
	{
		list: () => [],
		title: "更多",
	}
);

const slots = useSlots();

// s 是否展示更多
const showMore = defineModel("showMore", { type: Boolean, default: false });
// f  打开显示更多窗口
const openShowMore = () => {
	showMore.value = true;
};
</script>

<style lang="scss" scoped>
.line-overflow-list__wrap {
	box-sizing: border-box;
	position: relative;
	display: flex;
	flex-flow: row nowrap;
	align-items: center;
	gap: 2px;
	padding: 0 2px;

	height: fit-content;
	min-height: 16px;

	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	transition: 0.5s;

	& > :deep(*) {
		transition: 0.5s;
	}

	& > * {
		display: flex;
	}
}

// s 溢出元素样式
.line-overflow-list__wrap > :deep(.overflow) {
	position: relative;
	mask: linear-gradient(to right, rgb(255, 255, 255), transparent 50%);
	& + * {
		opacity: 0;
	}
}

// s 按钮样式
.line-overflow-list__button {
	height: 100%;
	aspect-ratio: 1;

	display: flex;
	align-items: center;
	justify-content: center;
}
/* .line-overflow-list__button[data-show="false"] {
  opacity: 0;
} */
/* .line-overflow-list__button[data-show="true"] {
  opacity: 1;
} */
.line-overflow-list__button:hover {
	background: rgba(135, 207, 235, 1);
}

// s 溢出按钮样式
.overflow-button {
	// ? 防止超出右侧
	position: sticky;
	right: 0;

	height: 100%;
	aspect-ratio: 1;

	border: 0.1px dashed rgba(0, 0, 0, 0.5);
	background: rgba(135, 207, 235, 0.5);
	box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
	cursor: pointer;
	border-radius: 4px;
	transition: 0.5s;

	&[data-show="true"] {
		background: rgb(135, 207, 235);
	}

	&::before {
		content: "";
		height: 100%;
		mask: linear-gradient(to right, rgb(255, 255, 255), transparent 50%);
	}
}

// s 空状态按钮样式
.void-button {
	/* position: absolute; */
	/* top: 50%; */
	/* transform: translateY(-50%); */
	left: 0;
	border: 0.1px dashed rgba(0, 0, 0, 0.5);
	background: rgba(135, 207, 235, 0.5);
	cursor: pointer;
	border-radius: 4px;
	transition: 0.5s;
}

// /* 对移动中的元素应用的过渡 */
// .fade-move {
// 	// position: absolute;
// 	transition: 0.5s;
// }

// /* 确保将离开的元素从布局流中删除
//  以便能够正确地计算移动的动画。 */
// .fade-leave-active {
// 	position: absolute;
// }

// // 进场过渡
// .fade-enter-from {
// 	opacity: 0;
// 	transform: translateY(10px);
// }
// // 退场过渡
// .fade-leave-to {
// 	opacity: 0;
// 	// transform: translateY(10px);
// }

// // 进入的过程中
// .fade-enter-active {
// 	transition: 0.5s;
// }
// // 离开的过程中
// .fade-leave-active {
// 	transition: 0.3s;
// }
</style>
