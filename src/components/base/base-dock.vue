<template>
	<BaseDragDialog
		v-model:show="show"
		ref="dragDialog"
		close-reset-state
		:init-percent-y="0.98"
		:min-height="0"
		init-size="auto"
		:header-style="{
			height: '16px',
			// flexFlow: 'column nowrap',
		}"
		:dialog-style="{
			borderRadius: '4px',
			overflow: 'hidden',
		}"
		:click-outside-close="false">
		<template #header-left>
			<!-- s 可拖拽条 -->
			<slot name="draggableBar">
				<!-- 默认可拖拽条 -->
				<div class="base-dock__drag-bar"></div>
			</slot>
		</template>
		<!-- s dock按钮区域 -->
		<div ref="contentDOM" class="base-dock__content">
			<slot>
				<n-button type="error" @click="show = false">
					<template #icon>
						<i-ep-close style="height: 100%; aspect-ratio: 1" />
					</template>
				</n-button>
			</slot>
		</div>
	</BaseDragDialog>
</template>

<script setup lang="ts">
	import { ref, watch, onMounted, onUpdated, useSlots, nextTick } from "vue";
	import { useMutationObserver } from "@vueuse/core";
	import BaseDragDialog from "@/components/base/base-drag-dialog.vue";
	const show = defineModel("show", { type: Boolean, default: false });
	const dragDialog = ref<InstanceType<typeof BaseDragDialog>>();
	const contentDOM = ref<HTMLElement>();

	onMounted(() => {
		useMutationObserver(
			contentDOM,
			async () => {
				console.log("dock变化");
				await dragDialog.value?.updateSize();
				dragDialog.value?.toCenter("horizontal");
			},
			{
				childList: true,
			}
		);
	});
	async function handleOpen() {
		await dragDialog.value?.updateSize();
		dragDialog.value?.toCenter("horizontal");
	}
</script>

<style lang="scss" scoped>
	* {
		box-sizing: border-box;
	}

	// s 拖拽条
	.base-dock__drag-bar {
		position: relative;
		width: 100%;
		height: 100%;
		transition: 0.5s ease;

		box-shadow: inset 0 0 2px gray;

		&:hover,
		&:active {
			background: rgba(135, 207, 235, 0.8);
		}

		&::after {
			content: "";
			position: absolute;
			height: 20%;
			width: 80%;
			top: 50%;
			left: 50%;
			border-radius: 10px;
			transform: translate(-50%, -50%);
			background: rgb(135, 207, 235);
			box-shadow: 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 2px gray;
			transition: 0.5s ease;
		}
		&:hover::after,
		&:active::after {
			background: gray;
			// box-shadow: inset 0 0 1px black, 0 0 1px gray;
		}
	}

	.base-dock__content {
		box-sizing: border-box;
	}
</style>
