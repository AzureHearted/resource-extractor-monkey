<template>
	<n-form
		label-placement="left"
		:model="rule"
		:disabled="rule.id.includes('#')"
		style="margin-top: 10px"
		:show-feedback="false"
	>
		<n-form-item path="source.selector" label="选择器">
			<n-input-group style="align-items: center">
				<n-input
					v-model:value="rule.source.selector"
					clearable
					placeholder="填入要匹配源的选择器"
				>
					<template v-if="rule.region.enable" #prefix>
						<n-gradient-text type="success" @mousedown.stop>
							{{ rule.region.selector }}
						</n-gradient-text>
					</template>
				</n-input>
			</n-input-group>
		</n-form-item>
		<n-form-item path="source.infoType" label="匹配类型">
			<n-input-group style="align-items: center">
				<n-select
					style="flex: 1"
					v-model:value="rule.source.infoType"
					:options="matchTypeOptions"
					placeholder="选择匹配类型"
				>
				</n-select>
				<n-input
					v-if="
						rule.source.infoType === 'attribute' ||
						rule.source.infoType === 'property'
					"
					style="flex: 3"
					v-model:value="rule.source.name"
					clearable
					placeholder="填入要匹配的属性名"
				>
				</n-input>
			</n-input-group>
		</n-form-item>
		<n-form-item path="source.assertionType" label="类型断言">
			<n-select
				v-model:value="rule.source.assertionType"
				:options="metaTypeOptions"
				placeholder="选择断言类型"
			>
			</n-select>
		</n-form-item>
		<n-divider title-placement="left" style="font-size: 14px; margin: 0">
			修正匹配结果
		</n-divider>
		<n-form-item path="source.fix">
			<!-- 修正结果列表 -->
			<FixList :rule="rule" type="source"></FixList>
		</n-form-item>
	</n-form>
</template>

<script setup lang="ts">
import { Rule } from "@/models/Rule";
import { matchTypeOptions, metaTypeOptions } from "../publicData";

import FixList from "../fix-list.vue";

withDefaults(
	defineProps<{
		rule: Rule;
	}>(),
	{},
);
</script>

<style lang="scss" scoped></style>
