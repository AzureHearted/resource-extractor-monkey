<template>
	<BaseDragDialog
		v-model:show="show"
		:teleport-to="teleportTo"
		:title="title"
		allow-resize
		allow-full-screen
		close-reset-state
		:click-outside-close="false"
		:dialog-style="{
			backdropFilter: 'blur(5px)',
			background: 'rgba(255, 255, 255, 0.5)',
		}"
		@before-close="handleClose"
	>
		<template #default>
			<div style="padding: 2px">
				<!-- {{ tags }} -->
				<n-dynamic-tags
					v-model:value="tagList"
					type="info"
					@update:value="handleChange"
				/>
			</div>
		</template>
		<template #footer>
			<n-flex :size="4">
				<n-button
					tag="div"
					style="margin-left: auto"
					type="success"
					size="small"
					@click="handleSave"
				>
					保存
				</n-button>
				<n-button tag="div" size="small" @click="handleCancel"> 取消 </n-button>
			</n-flex>
		</template>
	</BaseDragDialog>
</template>

<script setup lang="ts">
import BaseDragDialog from "@/components/base/base-drag-dialog.vue";
import { ref, nextTick } from "vue";
const show = defineModel("show", { type: Boolean, default: false });
// const tags = defineModel("tags", { type: Array<string>, default: () => [] });

const props = withDefaults(
	defineProps<{
		tags?: string[];
		title?: string;
		teleportTo?: string;
		initWidth?: number;
		initHeight?: number;
	}>(),
	{
		initWidth: 300,
		initHeight: 200,
	}
);

const tagList = ref(props.tags || []);

const emits = defineEmits<{
	(e: "onSave", newTags: string[]): void;
	(e: "onCancel"): void;
	(e: "onClose"): void;
	(e: "onChange", newTags: string[]): void;
}>();

const handleSave = () => {
	// console.log("newTags", tags.value);
	emits("onSave", tagList.value);
	nextTick(() => {
		show.value = false;
		tagList.value = [];
	});
};

const handleClose = () => {
	emits("onClose");
};

const handleCancel = () => {
	emits("onCancel");
	show.value = false;
};

const handleChange = (newTags: string[]) => {
	emits("onChange", newTags);
};
</script>

<style lang="scss" scoped></style>
