<template>
	<n-form
		label-placement="left"
		:model="rule"
		:disabled="rule.id.includes('#')"
		style="margin-top: 10px"
		:show-feedback="false"
	>
		<n-form-item path="region.enable">
			<n-checkbox v-model:checked="rule.region.enable">
				启用约束区域
			</n-checkbox>
		</n-form-item>
		<n-form-item
			v-if="rule.region.enable"
			path="region.selector"
			label="区域选择器"
		>
			<n-input-group
				style="align-items: center; gap: 8px"
				:show-feedback="false"
			>
				<n-input
					v-model:value="rule.region.selector"
					clearable
					placeholder="填入要匹配区域的选择器"
				/>
			</n-input-group>
		</n-form-item>
	</n-form>
</template>

<script setup lang="ts">
import { Rule } from "@/models/Rule/Rule";

withDefaults(
	defineProps<{
		rule: Rule;
	}>(),
	{},
);
</script>

<style lang="scss" scoped></style>
