<template>
	<n-form
		label-placement="left"
		:model="rule"
		:disabled="rule.id.includes('#')"
		style="margin-top: 10px"
		:show-feedback="false"
	>
		<n-form-item path="description.enable">
			<n-checkbox v-model:checked="rule.description.enable">
				匹配预览源
				<n-gradient-text v-if="!rule.description.enable" type="info">
					(当前未启用：将默认使用"源"的匹配结果作为"描述内容")
				</n-gradient-text>
			</n-checkbox>
		</n-form-item>
		<n-form-item
			v-if="rule.description.enable"
			path="description.selector"
			label="选择器"
		>
			<n-input-group style="align-items: center">
				<n-select
					style="flex: 1"
					v-model:value="rule.description.origin"
					:options="originOptions"
					placeholder="选择匹配方式"
				>
				</n-select>
				<n-input
					v-if="rule.description.origin === 'custom'"
					style="flex: 3"
					v-model:value="rule.description.selector"
					clearable
					placeholder="填入要匹配描述内容的选择器"
				>
					<template #prefix>
						<n-gradient-text type="success" @mousedown.stop>
							{{ rule.region.selector }}
						</n-gradient-text>
					</template>
				</n-input>
				<n-input-group-label
					v-else-if="rule.description.origin === 'region'"
					style="flex: 3"
				>
					<n-gradient-text type="success" @mousedown.stop>
						{{ rule.region.selector }}
					</n-gradient-text>
				</n-input-group-label>
				<n-input-group-label
					v-else-if="rule.description.origin === 'source'"
					style="flex: 3"
				>
					<n-gradient-text type="success" @mousedown.stop>
						{{ `${rule.region.selector} ${rule.source.selector}` }}
					</n-gradient-text>
				</n-input-group-label>
				<n-input-group-label
					v-else-if="rule.description.origin === 'preview'"
					style="flex: 3"
				>
					<n-gradient-text type="success" @mousedown.stop>
						<template v-if="rule.preview.origin === 'custom'">
							{{ `${rule.region.selector} ${rule.preview.selector}` }}
						</template>
						<template v-else-if="rule.preview.origin === 'region'">
							{{ `${rule.region.selector}` }}
						</template>
						<template v-else-if="rule.preview.origin === 'source'">
							{{ `${rule.region.selector} ${rule.source.selector}` }}
						</template>
					</n-gradient-text>
				</n-input-group-label>
			</n-input-group>
		</n-form-item>
		<n-form-item
			v-if="rule.description.enable"
			path="description.infoType"
			label="匹配类型"
		>
			<n-input-group style="align-items: center">
				<n-select
					style="flex: 1"
					v-model:value="rule.description.infoType"
					:options="matchTypeOptions"
					placeholder="选择匹配类型"
				>
				</n-select>
				<n-input
					v-if="
						rule.description.infoType === 'attribute' ||
						rule.description.infoType === 'property'
					"
					style="flex: 3"
					v-model:value="rule.description.name"
					clearable
					placeholder="填入要匹配的属性名"
				>
				</n-input>
			</n-input-group>
		</n-form-item>
		<template v-if="rule.description.enable">
			<n-divider title-placement="left" style="font-size: 14px; margin: 0">
				修正匹配结果
			</n-divider>
			<n-form-item path="description.fix">
				<!-- 修正结果列表 -->
				<FixList :rule="rule" type="description"></FixList>
			</n-form-item>
		</template>
	</n-form>
</template>

<script setup lang="ts">
import { NSelect } from "naive-ui";

import { Rule } from "@/models/Rule";
import { matchTypeOptions } from "../publicData";

import FixList from "../fix-list.vue";
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		rule: Rule;
	}>(),
	{},
);

// j 匹配起点选项
const originOptions = computed<InstanceType<typeof NSelect>["options"]>(() => {
	const options = [
		{
			label: "自定义",
			value: "custom",
		},
	];

	if (props.rule.region.enable) {
		options.push({
			label: "使用约束区域元素",
			value: "region",
		});
	}

	options.push({
		label: "使用源元素",
		value: "source",
	});

	if (props.rule.preview.enable) {
		options.push({
			label: "使用预览源元素",
			value: "preview",
		});
	}

	return options;
});
</script>

<style lang="scss" scoped></style>
