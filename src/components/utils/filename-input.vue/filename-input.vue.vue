<template>
	<n-flex :size="4" vertical>
		<n-text>{{ label }}</n-text>
		<n-input
			type="text"
			:disabled="disabled"
			v-model:value="name"
			:placeholder="placeholderMessage"
			:clearable="clearable"
			:autofocus="autofocus"
			:loading="loading"
			:size="size"
			:show-count="showCount"
			:round="round"
			:status="status"
			v-bind="$attrs"
		></n-input>
	</n-flex>
</template>

<script setup lang="ts">
import type { InputSize, FormValidationStatus } from "naive-ui";
import { computed, onMounted, watch } from "vue";

const props = withDefaults(
	defineProps<{
		placeholder?: string;
		label?: string;
		clearable?: boolean;
		disabled?: boolean;
		autofocus?: boolean;
		loading?: boolean;
		size?: InputSize;
		showCount?: boolean;
		round?: boolean;
	}>(),
	{
		label: "名称",
		placeholder: "请输入名称",
		loading: undefined,
		showCount: true,
	},
);

const emits = defineEmits<{
	"updata:status": [value: FormValidationStatus];
}>();

const name = defineModel<string>("name", { default: "" });
const isVoid = computed(() => name.value.trim() === "");
const isValid = computed(
	() => !/[\\\/\:\*\?\"\<\>\|]/.test(name.value.trim()) || isVoid.value,
);

const status = computed<FormValidationStatus>(() => {
	if (isVoid.value) return "error";
	// 判断是否有路径不合法字符
	if (!isValid.value) return "warning";
	return "success";
});

const placeholderMessage = computed(() => {
	if (isVoid.value) return "文件名不能为空";
	if (isValid.value) return "存在不合法字符";
	return props.placeholder;
});

onMounted(() => {
	emits("updata:status", status.value);
});

watch(status, (val, oldVal) => {
	if (val === oldVal) return;
	emits("updata:status", val);
});
</script>

<style lang="scss" scoped></style>
