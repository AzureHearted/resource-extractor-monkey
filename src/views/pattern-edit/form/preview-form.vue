<template>
	<n-form
		label-placement="left"
		:model="rule"
		:disabled="rule.id.includes('#')"
		style="margin-top: 10px"
		:show-feedback="false"
	>
		<n-form-item path="preview.enable">
			<n-checkbox v-model:checked="rule.preview.enable">
				匹配预览源
				<n-gradient-text v-if="!rule.preview.enable" type="info">
					(当前未启用：将默认使用"源"作为"预览源")
				</n-gradient-text>
			</n-checkbox>
		</n-form-item>
		<n-form-item
			v-if="rule.preview.enable"
			path="preview.selector"
			label="选择器"
		>
			<n-input-group style="align-items: center">
				<n-select
					style="flex: 1"
					v-model:value="rule.preview.origin"
					:options="originOptions"
					placeholder="选择匹配方式"
				>
				</n-select>
				<n-input
					v-if="rule.preview.origin === 'custom'"
					style="flex: 3"
					v-model:value="rule.preview.selector"
					clearable
					placeholder="填入要匹配预览源的选择器"
				>
					<template #prefix>
						<n-gradient-text type="success" @mousedown.stop>
							{{ rule.region.selector }}
						</n-gradient-text>
					</template>
				</n-input>
				<n-input-group-label
					v-else-if="rule.preview.origin === 'region'"
					style="flex: 3"
				>
					<n-gradient-text type="success" @mousedown.stop>
						{{ rule.region.selector }}
					</n-gradient-text>
				</n-input-group-label>
				<n-input-group-label
					v-else-if="rule.preview.origin === 'source'"
					style="flex: 3"
				>
					<n-gradient-text type="success" @mousedown.stop>
						{{ `${rule.region.selector} ${rule.source.selector}` }}
					</n-gradient-text>
				</n-input-group-label>
			</n-input-group>
		</n-form-item>
		<n-form-item
			v-if="rule.preview.enable"
			path="preview.infoType"
			label="匹配类型"
		>
			<n-input-group style="align-items: center">
				<n-select
					style="flex: 1"
					v-model:value="rule.preview.infoType"
					:options="matchTypeOptions"
					placeholder="选择匹配类型"
				>
				</n-select>
				<n-input
					v-if="
						rule.preview.infoType === 'attribute' ||
						rule.preview.infoType === 'property'
					"
					style="flex: 3"
					v-model:value="rule.preview.name"
					clearable
					placeholder="填入要匹配的属性名"
				>
				</n-input>
			</n-input-group>
		</n-form-item>
		<n-form-item
			v-if="rule.preview.enable"
			path="preview.assertionType"
			label="类型断言"
		>
			<n-select
				v-model:value="rule.preview.assertionType"
				:options="metaTypeOptions"
				placeholder="选择断言类型"
			>
			</n-select>
		</n-form-item>
		<template v-if="rule.preview.enable">
			<n-divider title-placement="left" style="font-size: 14px; margin: 0">
				修正匹配结果
			</n-divider>
			<n-form-item path="preview.fix">
				<!-- 修正结果列表 -->
				<FixList :rule="rule" type="preview"></FixList>
			</n-form-item>
		</template>
	</n-form>
</template>

<script setup lang="ts">
import { Rule } from "@/models";
import { NSelect } from "naive-ui";
import { computed } from "vue";
import FixList from "../fix-list.vue";
import { matchTypeOptions, metaTypeOptions } from "../publicData";

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

	return options;
});
</script>

<style lang="scss" scoped></style>
