<template>
	<div v-show="!disable">
		<el-divider content-position="left">结果修正</el-divider>
		<el-form>
			<transition-group name="list-complete" appear>
				<el-form-item v-for="(item, index) in fixList" :key="index">
					<el-card class="fix-item-card" shadow="hover">
						<template #header>
							<div class="form-card-header">
								<div class="form-card-header-left">
									<span>
										<span v-if="fixList.length > 1"> {{ index + 1 }} - </span>
										{{ typeName(item.type) }}
									</span>
								</div>
								<div class="form-card-header-right">
									<!-- 上移 -->
									<el-button
										:disabled="!index"
										:type="!index ? '' : 'primary'"
										:text="!index"
										circle
										@click.stop="upItem(index)"
									>
										<template #icon>
											<icon-ep-arrow-up-bold />
										</template>
									</el-button>
									<!-- 下移 -->
									<el-button
										:disabled="!(index < fixList.length - 1)"
										:type="!(index < fixList.length - 1) ? '' : 'primary'"
										circle
										:text="!(index < fixList.length - 1)"
										@click.stop="downItem(index)"
									>
										<template #icon>
											<icon-ep-arrow-down-bold />
										</template>
									</el-button>
									<!-- 删除 -->
									<el-popconfirm
										title="确定删除?"
										:hide-after="0"
										confirm-button-text="是"
										cancel-button-text="否"
										@confirm="fixList.splice(index, 1)"
									>
										<template #reference>
											<el-button type="danger" circle plain @click.stop>
												<template #icon>
													<icon-material-symbols-delete-rounded />
												</template>
											</el-button>
										</template>
									</el-popconfirm>
								</div>
							</div>
						</template>
						<!-- 正则类修正配置表单 -->
						<el-form
							label-position="left"
							v-if="
								item.type === 'regex-replace' || item.type === 'regex-extract'
							"
						>
							<el-form-item
								:label="
									item.type === 'regex-extract' ? '提取表达式' : '匹配表达式'
								"
							>
								<el-input
									v-model="item.expression"
									placeholder="输入正则表达式"
								>
									<template #prefix> / </template>
									<template #suffix> / </template>
									<template #append>
										<el-select
											style="width: 120px"
											multiple
											collapse-tags
											collapse-tags-tooltip
											clearable
											v-model="item.flags"
											placeholder="修饰符"
										>
											<el-tooltip
												:show-after="500"
												effect="dark"
												content="ignore - 不区分大小写"
												placement="top"
											>
												<el-option :value="'i'" label="i" />
											</el-tooltip>
											<el-tooltip
												:show-after="500"
												effect="dark"
												content="特殊字符圆点 . 中包含换行符 \n"
												placement="top"
											>
												<el-option :value="'s'" label="s" />
											</el-tooltip>
										</el-select>
									</template>
								</el-input>
							</el-form-item>
							<el-form-item
								v-if="item.type === 'regex-replace'"
								label="替换表达式"
							>
								<el-input
									v-model="item.replaceTo"
									placeholder="输入正则替换表达式"
								/>
							</el-form-item>
						</el-form>
						<!-- 抓取页面并提取内容 -->
						<el-form
							label-position="left"
							v-if="item.type === 'fetch-page-and-extract-content'"
						>
							<el-form-item label="选择器" label-width="54px">
								<el-input
									v-model="item.selector"
									placeholder="请输入css选择器"
									clearable
								>
								</el-input>
							</el-form-item>
							<el-form-item label="类型" label-width="54px">
								<el-select
									v-model="item.infoType"
									placeholder="选择要提取的类型"
								>
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
									v-model="item.name"
									placeholder="请输入要匹配的属性值名称 (仅在“属性”类型下生效)"
									clearable
								></el-input>
							</el-form-item>
						</el-form>
					</el-card>
				</el-form-item>
			</transition-group>
			<!-- 添加按钮 -->
			<el-form-item>
				<n-dropdown
					:disabled="rule.id.includes('#')"
					trigger="hover"
					:to="false"
					:options="options"
					@select="handleSelect"
				>
					<n-button type="info" dashed block :disabled="rule.id.includes('#')">
						添加
					</n-button>
				</n-dropdown>
			</el-form-item>
		</el-form>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Rule } from "@/stores/PatternStore/class/Rule";
import type { BaseFix } from "@/stores/PatternStore/interface/Pattern";

const rule = defineModel("rule", { type: Rule, required: true });
const props = withDefaults(
	defineProps<{
		type: "source" | "preview" | "description";
		disable?: boolean;
	}>(),
	{
		disable: false,
	}
);

// 类型选项
const options: { label: string; key: BaseFix["type"] }[] = [
	{
		label: "正则提取",
		key: "regex-extract",
	},
	{
		label: "正则替换",
		key: "regex-replace",
	},
	{
		label: "抓取页面并提取内容",
		key: "fetch-page-and-extract-content",
	},
];

// j 修正项
const fixList = computed(() => {
	return rule.value[props.type].fix;
});

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

// f 选项点击事件
function handleSelect(type: BaseFix["type"]) {
	rule.value.addFixItem(props.type, type);
}

// f 上移修正规则
function upItem(index: number) {
	// const fixList = rule.value[props.type].fix;
	fixList.value.splice(index - 1, 0, fixList.value.splice(index, 1)[0]);
}
// f 下移修正规则
function downItem(index: number) {
	// const fixList = rule.value[props.type].fix;
	fixList.value.splice(index, 0, fixList.value.splice(index + 1, 1)[0]);
}
</script>

<style lang="scss" scoped>
.fix-item-card {
	flex: 1;
	margin: 0 6px;
	:deep(.wic2-card__header) {
		padding: 4px 10px;
	}
	:deep(.wic2-card__body) {
		padding: 4px 10px;
	}
	:deep(.wic2-card__footer) {
		padding: 8px 10px;
	}

	:deep(.wic2-form-item) {
		&:nth-child(1) {
			margin-top: 6px;
		}
		margin-bottom: 6px;
	}
}

.form-card-header {
	display: flex;
	justify-content: space-between;
	font-size: 14px;
	width: 100%;

	.form-card-header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.form-card-header-right {
		margin-left: auto;
	}
}

/* 对移动中的元素应用的过渡 */
.list-complete-move,
.list-complete-enter-active,
.list-complete-leave-active {
	transition: all 0.3s;
}

// 进场过渡
.list-complete-enter-from {
	position: absolute;
	opacity: 0;
	transform: translateY(40px);
}
// 退场过渡
.list-complete-leave-to {
	opacity: 0;
	transform: scale(0.1);
}

// 进入的过程中
.list-complete-enter-active {
	transition: all 0.5s;
}
// 离开的过程中
.list-complete-leave-active {
	transition: all 0.3s;
}
</style>
