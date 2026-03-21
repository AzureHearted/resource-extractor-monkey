<template>
	<el-form ref="form" label-position="left" :disabled="rule!.id.includes('#')">
		<el-form-item label="选择器" label-width="54px">
			<el-input
				v-model="rule.source.selector"
				placeholder="请输入css选择器"
				clearable
			>
				<template v-if="rule.region.enable" #prepend>
					<span
						:title="rule.region.selector"
						@click="copy(rule.region.selector)"
					>
						{{ rule.region.selector }}
					</span>
				</template>
			</el-input>
		</el-form-item>
		<el-form-item label="类型" label-width="54px">
			<el-select v-model="rule.source.infoType" placeholder="选择要提取的类型">
				<el-option value="value" label="值" />
				<el-option value="attribute" label="Attribute属性" />
				<el-option value="property" label="Property属性" />
				<el-option value="innerText" label="innerText 内部文本" />
				<el-option value="innerHTML" label="innerHTML 内部HTML" />
				<el-option value="outerHTML" label="outerHTML 全部HTML" />
			</el-select>
		</el-form-item>
		<el-form-item label="属性名" label-width="54px">
			<el-input
				v-model="rule.source.name"
				placeholder="请输入要匹配的属性值名称 (仅在“属性”类型下生效)"
				clearable
			></el-input>
		</el-form-item>
		<!-- 修正方案 -->
		<FixFrom :rule="rule" :disable="rule.id.includes('#')" type="source" />
	</el-form>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { Rule } from "@/models/Rule/Rule";

import FixFrom from "./card-from-fix.vue";
const { copy } = useClipboard();
const rule = defineModel("rule", { type: Rule, required: true });
</script>

<style lang="scss" scoped></style>
