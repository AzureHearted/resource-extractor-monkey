<template>
	<el-tabs v-model="activeName" class="demo-tabs">
		<el-tab-pane
			:label="`约束区域${editingRule?.isChange('region') ? '*' : ''}`"
			lazy
			name="region"
		>
			<el-form
				v-if="editingRule"
				ref="form"
				label-position="left"
				:disabled="editingRule!.id.includes('#')"
			>
				<el-form-item label="开启区域约束" label-width="auto">
					<el-checkbox
						label="开启"
						v-model="editingRule!.region.enable"
						:indeterminate="false"
					/>
				</el-form-item>
				<el-form-item
					v-show="editingRule!.region.enable"
					label="选择器"
					label-width="54px"
				>
					<el-input
						v-model="editingRule!.region.selector"
						placeholder="请输入css选择器"
						clearable
					></el-input>
				</el-form-item>
			</el-form>
		</el-tab-pane>
		<el-tab-pane
			:label="`匹配：源(必填)${editingRule?.isChange('source') ? '*' : ''}`"
			lazy
			name="source"
		>
			<FormSource v-if="editingRule" v-model:rule="editingRule" />
		</el-tab-pane>
		<el-tab-pane
			:label="`匹配：预览源${editingRule?.isChange('preview') ? '*' : ''}`"
			lazy
			name="preview"
		>
			<FormPreview v-if="editingRule" v-model:rule="editingRule" />
		</el-tab-pane>
		<el-tab-pane
			:label="`匹配：描述${editingRule?.isChange('description') ? '*' : ''}`"
			lazy
			name="description"
		>
			<FormDescription v-if="editingRule" v-model:rule="editingRule" />
		</el-tab-pane>
	</el-tabs>
</template>

<script lang="ts" setup>
import { ref } from "vue";

import FormSource from "./form/form-source.vue";
import FormPreview from "./form/form-preview.vue";
import FormDescription from "./form/form-description.vue";

import { storeToRefs } from "pinia";
import usePatternStore from "@/stores/PatternStore";

const patternStore = usePatternStore();
const { editingRule } = storeToRefs(patternStore);

const activeName = ref("region");
</script>

<style lang="scss" scoped>
:deep(.re-tabs__content) {
	overflow: visible;
}
.fix-item-card {
	flex: 1;
	margin: 0 6px;
	:deep(.re-card__header) {
		padding: 4px 10px;
	}
	:deep(.re-card__body) {
		padding: 4px 10px;
	}
	:deep(.re-card__footer) {
		padding: 8px 10px;
	}

	:deep(.re-form-item) {
		&:nth-child(1) {
			margin-top: 6px;
		}
		margin-bottom: 6px;
	}
}

.form-card-header {
	display: flex;
	justify-content: space-between;

	.form-card-header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}
}
</style>
