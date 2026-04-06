<template>
	<n-list style="width: 100%; background: unset" :show-divider="false">
		<n-list-item v-for="(fixItem, index) in fixList">
			<template #default>
				<n-card size="small">
					<template #header>
						<div style="white-space: nowrap">
							{{ fixList.length > 1 ? `${index + 1} - ` : "" }}
							{{ typeName(fixItem.type) }}
						</div>
					</template>
					<template #header-extra>
						<n-button-group>
							<n-button
								v-if="index > 0"
								@click="moveFixItem(type, index, index - 1)"
							>
								<icon-ep-arrow-up-bold />
							</n-button>
							<n-button
								v-if="index < fixList.length - 1"
								@click="moveFixItem(type, index, index + 1)"
							>
								<icon-ep-arrow-down-bold />
							</n-button>
							<n-button type="error" @click="deleteFixItem(type, index)">
								<icon-material-symbols-delete-rounded />
							</n-button>
						</n-button-group>
					</template>
					<template #default>
						<!-- s 正则提取 -->
						<n-form
							v-if="fixItem.type === 'regex-extract'"
							label-placement="left"
							:model="fixItem"
							:disabled="rule.id.includes('#')"
							:show-feedback="false"
						>
							<n-form-item path="expression" label="匹配表达式">
								<n-input-group
									v-if="fixItem.type === 'regex-extract'"
									style="align-items: center; gap: 8px"
								>
									<n-input
										v-model:value="fixItem.expression"
										clearable
										placeholder="输入提取表达式"
										style="flex: 2"
									>
										<template #prefix> / </template>
										<template #suffix> / </template>
									</n-input>
									<n-select
										style="flex: 1"
										v-model:value="fixItem.flags"
										multiple
										:options="regexFlagOptions"
										:render-option="regexFlagRenderOption"
										placeholder="正则修饰符"
									>
									</n-select>
								</n-input-group>
							</n-form-item>
						</n-form>
						<!-- s 正则替换 -->
						<n-form
							v-if="fixItem.type === 'regex-replace'"
							label-placement="left"
							size="small"
							:model="fixItem"
							:disabled="rule.id.includes('#')"
							:show-feedback="false"
						>
							<n-form-item path="expression" label="匹配表达式">
								<n-input-group style="align-items: center; gap: 8px">
									<n-input
										v-model:value="fixItem.expression"
										clearable
										placeholder="输入匹配表达式"
										style="flex: 2"
									>
										<template #prefix> / </template>
										<template #suffix> / </template>
									</n-input>
									<n-select
										style="flex: 1"
										v-model:value="fixItem.flags"
										multiple
										:options="regexFlagOptions"
										:render-option="regexFlagRenderOption"
										placeholder="正则修饰符"
										clearable
									>
									</n-select>
								</n-input-group>
							</n-form-item>
							<n-form-item path="replaceTo" label="替换表达式">
								<n-input-group style="align-items: center; gap: 8px">
									<n-input
										v-model:value="fixItem.replaceTo"
										clearable
										placeholder="输入替换表达式"
										style="flex: 2"
									>
									</n-input>
								</n-input-group>
							</n-form-item>
						</n-form>
						<!-- s 抓取页面并提取内容 -->
						<n-form
							v-if="fixItem.type === 'fetch-page-and-extract-content'"
							label-placement="left"
							size="small"
							:model="fixItem"
							:disabled="rule.id.includes('#')"
							:show-feedback="false"
						>
							<n-form-item path="selector" label="替换表达式">
								<n-input-group
									v-if="fixItem.type === 'fetch-page-and-extract-content'"
									style="align-items: center; gap: 8px"
								>
									<n-input
										v-model:value="fixItem.selector"
										clearable
										placeholder="输入选择器"
									>
									</n-input>
								</n-input-group>
							</n-form-item>
							<n-form-item path="source.infoType" label="匹配类型">
								<n-input-group style="align-items: center; gap: 8px">
									<n-select
										style="flex: 1"
										v-model:value="fixItem.infoType"
										:options="matchTypeOptions"
										placeholder="选择匹配类型"
									>
									</n-select>
									<n-input
										v-if="
											fixItem.infoType === 'attribute' ||
											fixItem.infoType === 'property'
										"
										style="flex: 3"
										v-model:value="fixItem.name"
										clearable
										placeholder="填入要匹配的属性名"
									>
									</n-input>
								</n-input-group>
							</n-form-item>
						</n-form>
					</template>
				</n-card>
			</template>
		</n-list-item>
		<!-- 新增修正项按钮 -->
		<n-list-item>
			<n-dropdown
				:disabled="rule.id.includes('#')"
				trigger="hover"
				:options="fixTypeOptions"
				@select="($event: any) => addFixItem(type, $event)"
			>
				<n-button type="info" dashed block :disabled="rule.id.includes('#')">
					添加
				</n-button>
			</n-dropdown>
		</n-list-item>
	</n-list>
</template>

<script setup lang="ts">
import { Rule } from "@/models/Rule";
import type { BaseFix } from "@/models/Rule/interface/Rule";
import {
	fixTypeOptions,
	matchTypeOptions,
	regexFlagOptions,
	regexFlagRenderOption,
} from "./publicData";
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		rule: Rule;
		type: "source" | "preview" | "description";
	}>(),
	{},
);

const fixList = computed(() => props.rule[props.type].fix);

// j 类型名称
function typeName(type: BaseFix["type"]) {
	switch (type) {
		case "regex-extract":
			return "正则提取";
		case "regex-replace":
			return "正则替换";
		case "fetch-page-and-extract-content":
			return "抓取页面并提取内容";
		default:
			return "";
	}
}

// f 新增修正项
function addFixItem(
	type: "source" | "preview" | "description",
	fixType: BaseFix["type"],
) {
	props.rule.addFixItem(type, fixType);
}

// f 删除修正项
function deleteFixItem(
	type: "source" | "preview" | "description",
	index: number,
) {
	props.rule[type].fix.splice(index, 1);
}

// f 移动修正项
function moveFixItem(
	type: "source" | "preview" | "description",
	fromIndex: number,
	toIndex: number,
) {
	props.rule[type].fix.splice(
		toIndex,
		0,
		props.rule[type].fix.splice(fromIndex, 1)[0],
	);
}
</script>

<style lang="scss" scoped>
:deep(.re-list-item) {
	padding: 4px 0px;
}
:deep(.re-card-header) {
	font-size: 14px;
	padding: 8px 16px;
}
</style>
