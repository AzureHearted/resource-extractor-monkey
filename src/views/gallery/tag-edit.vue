<template>
	<BaseWindow v-model:show="show" @close="handleClose" :title="title">
		<template #default>
			<BaseFlex direction="column">
				<div style="padding: 2px; flex: 1">
					<!-- {{ tags }} -->
					<n-dynamic-tags
						v-model:value="tagList"
						type="info"
						@update:value="handleChange"
					/>
				</div>
				<BaseFlex style="flex: 0" :gap="4">
					<n-button
						tag="div"
						style="margin-left: auto"
						type="success"
						size="small"
						@click="handleSave"
					>
						保存
					</n-button>
					<n-button tag="div" size="small" @click="handleCancel">
						取消
					</n-button>
				</BaseFlex>
			</BaseFlex>
		</template>
	</BaseWindow>
</template>

<script setup lang="ts">
import { BaseFlex, BaseWindow } from "base-ui";
import { ref, nextTick } from "vue";

const show = defineModel("show", { type: Boolean, default: false });

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
	},
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
