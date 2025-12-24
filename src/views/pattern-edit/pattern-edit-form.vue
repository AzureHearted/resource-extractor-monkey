<template>
	<div class="pattern-form__container">
		<el-card v-if="editingPattern" class="pattern-form__card">
			<template #header>
				<div class="form-card-header">
					<div class="form-card-header-left">
						<icon-material-symbols-box-edit v-if="disabled" />
						<BaseImg
							v-else
							:src="editingPattern?.mainInfo.icon"
							style="width: 16px; height: 16px"
						></BaseImg>
						<span>{{ editingPattern?.mainInfo?.name }}</span>
						<!-- s 在新窗口打开 -->
						<el-button
							v-if="!disabled"
							type="success"
							circle
							text
							@click="open(editingPattern.mainInfo.host)"
						>
							<icon-material-symbols-open-in-new />
						</el-button>
					</div>
					<div class="form-card-header-right">
						<!-- 下载方案 -->
						<el-button
							type="success"
							circle
							text
							@click="saveToFile(editingPattern)"
						>
							<icon-material-symbols-download />
						</el-button>
						<!-- 拷贝方案至剪贴板 -->
						<el-button
							type="primary"
							circle
							text
							@click="copyToClipboard(editingPattern)"
						>
							<icon-ep-document-copy />
						</el-button>
					</div>
				</div>
			</template>
			<!-- 方案表单 -->
			<el-form
				v-if="editingPattern"
				ref="form"
				label-position="left"
				:disabled="disabled"
			>
				<el-form-item label="方案名称">
					<el-input
						v-model="editingPattern.mainInfo.name"
						placeholder=""
						clearable
					></el-input>
				</el-form-item>
				<el-form-item label="域名">
					<el-input
						v-model="editingPattern.mainInfo.host"
						placeholder="请输入域名地址"
						clearable
					></el-input>
				</el-form-item>
				<el-form-item label="匹配域名">
					<n-flex :size="4" style="flex: 1">
						<template
							v-for="(item, index) in editingPattern.mainInfo.matchHost"
							:key="index"
						>
							<el-input
								v-model="editingPattern.mainInfo.matchHost[index]"
								placeholder="请输入域名地址"
								clearable
							>
								<template v-if="!disabled" #append>
									<n-flex :size="4" style="margin: 0 -10px">
										<!-- s 新增 -->
										<n-button
											:disabled="disabled"
											type="success"
											size="tiny"
											circle
											@click="
												editingPattern.mainInfo.matchHost.splice(
													index + 1,
													0,
													''
												)
											"
										>
											<template #icon>
												<icon-ep-plus />
											</template>
										</n-button>
										<!-- s 打开 -->
										<n-button
											type="info"
											size="tiny"
											circle
											@click="open(item)"
										>
											<template #icon>
												<icon-material-symbols-open-in-new />
											</template>
										</n-button>
										<!-- s 删除 -->
										<el-popconfirm
											title="确定删除?"
											:hide-after="0"
											confirm-button-text="是"
											cancel-button-text="否"
											@confirm="
												editingPattern.mainInfo.matchHost.splice(index, 1)
											"
										>
											<template #reference>
												<n-button type="error" size="tiny" circle @click.stop>
													<template #icon>
														<icon-material-symbols-delete-rounded />
													</template>
												</n-button>
											</template>
										</el-popconfirm>
									</n-flex>
								</template>
							</el-input>
						</template>
					</n-flex>
				</el-form-item>
				<el-form-item label="过滤器">
					<el-input
						v-model="editingPattern.mainInfo.filter.expression"
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
								v-model="editingPattern.mainInfo.filter.flags"
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
				<el-form-item label="图标">
					<el-input
						v-model="editingPattern.mainInfo.icon"
						placeholder="输入图标地址"
						clearable
					>
						<template v-if="editingPattern.mainInfo.icon.length" #append>
							<el-image
								style="aspect-ratio: 1; height: 24px"
								:src="editingPattern.mainInfo.icon"
							>
								<template #error>
									<span></span>
								</template>
							</el-image>
						</template>
					</el-input>
				</el-form-item>
				<el-form-item label="标题选择器">
					<el-input
						v-model="editingPattern.mainInfo.titleSelector"
						placeholder=""
						clearable
					></el-input>
				</el-form-item>
			</el-form>
			<template v-if="!editingPattern.id.includes('#')" #footer>
				<el-button type="success" @click="save">
					<template #icon>
						<icon-material-symbols-save />
					</template>
					<el-badge
						is-dot
						:hidden="!editingPattern?.isChange()"
						:offset="[15, -7]"
					>
						保存
					</el-badge>
				</el-button>
				<el-button type="warning" @click="reset">
					<template #icon>
						<icon-material-symbols-reset-wrench-rounded />
					</template>
					重置
				</el-button>
				<el-button
					style="margin-left: auto"
					v-if="!editingPattern.id.includes('#')"
					type="primary"
					@click="pasteRule"
				>
					<template #icon>
						<icon-material-symbols-markdown-paste-rounded />
					</template>
					粘贴规则
				</el-button>
			</template>
		</el-card>
		<!-- 规则表单 -->
		<el-card v-if="editingRule" class="rule-form__card">
			<!-- 卡片头 -->
			<template #header>
				<div class="form-card-header">
					<div class="form-card-header-left">
						<el-input
							placeholder="规则名"
							:maxlength="30"
							show-word-limit
							:disabled="disabled"
							name="ruleName"
							v-model="editingRule.name"
						>
							<template #prefix>
								<el-icon color="black">
									<icon-material-symbols-regular-expression-rounded />
								</el-icon>
							</template>
						</el-input>
						<el-switch
							v-model="editingRule.enable"
							:disabled="disabled"
							style="--wic2-switch-off-color: #ff9f00"
							inline-prompt
							active-text="启用"
							inactive-text="禁用"
						/>
					</div>
					<div class="form-card-header-right">
						<!-- 下载规则 -->
						<el-button
							type="success"
							circle
							text
							@click="saveToFile(editingRule)"
						>
							<icon-material-symbols-download />
						</el-button>
						<!-- 拷贝方案至剪贴板 -->
						<el-button
							type="primary"
							circle
							text
							@click="copyToClipboard(editingRule)"
						>
							<icon-ep-document-copy />
						</el-button>
					</div>
				</div>
			</template>
			<!-- 路径正则过滤器 -->
			<!-- <el-form-item label="过滤器">
				<el-input
					v-model="editingRule.filter"
					placeholder="输入正则表达式">
					<template #prefix> / </template>
					<template #suffix> / </template>
					<template #append>
						<el-select
							style="width: 120px"
							multiple
							collapse-tags
							collapse-tags-tooltip
							clearable
							v-model="editingPattern.mainInfo.filter.flags"
							placeholder="修饰符">
							<el-tooltip
								:show-after="500"
								effect="dark"
								content="ignore - 不区分大小写"
								placement="top">
								<el-option :value="'i'" label="i" />
							</el-tooltip>
							<el-tooltip
								:show-after="500"
								effect="dark"
								content="特殊字符圆点 . 中包含换行符 \n"
								placement="top">
								<el-option :value="'s'" label="s" />
							</el-tooltip>
						</el-select>
					</template>
				</el-input>
			</el-form-item> -->
			<!-- 表单Tabs -->
			<FormTabs />
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { saveAs } from "file-saver";
import { useClipboard } from "@vueuse/core";
import FormTabs from "./pattern-edit-form-tabs.vue";
import BaseImg from "@/components/base/base-img.vue";
import { ElNotification } from "@/plugin/element-plus";
import { Pattern } from "@/stores/PatternStore/class/Pattern";
import { Rule } from "@/stores/PatternStore/class/Rule";

import { storeToRefs } from "pinia";
import usePatternStore from "@/stores/PatternStore";
import { GM_openInTab } from "$";
import { computed } from "vue";
const patternStore = usePatternStore();
const { editingPattern, editingRule } = storeToRefs(patternStore);
const { saveUserPatternInfo } = patternStore;

// j 是否禁用
const disabled = computed(() => {
	return editingPattern.value?.id.includes("#");
});

// f 保存结果
function save() {
	// console.log(editingPattern.value?.getJson());
	editingPattern.value?.backupData(); //先进行备份
	saveUserPatternInfo(); // 备份后进行数据存储
}
// f 重置表单
function reset() {
	editingPattern.value?.recoveryData();
}

// f 拷贝方案(或规则)至剪贴板
function copyToClipboard(obj: Pattern | Rule) {
	const { copy } = useClipboard();
	const rowData = JSON.stringify(obj.getRowData({ includeId: false }), null, 2);
	copy(rowData)
		.then(() => {
			ElNotification({
				type: "success",
				title: "成功",
				message:
					obj instanceof Pattern
						? `方案“${obj.mainInfo.name}”拷贝成功！`
						: `规则“${obj.name}”拷贝成功！`,
				appendTo: ".web-img-collector__notification",
			});
		})
		.catch(() => {
			ElNotification({
				type: "error",
				title: "失败",
				message:
					obj instanceof Pattern
						? `方案“${obj.mainInfo.name}”拷贝失败`
						: `规则“${obj.name}”拷贝失败`,
				appendTo: ".web-img-collector__notification",
			});
		});
}

// f 保存方案(或规则)至本地文件
function saveToFile(obj: Pattern | Rule) {
	const rowData = JSON.stringify(obj.getRowData({ includeId: true }), null, 2);
	// 将文本转为blob
	const blob = new Blob([rowData], { type: "text/plain;charset=utf-8" });
	if (obj instanceof Pattern) {
		saveAs(blob, `WebImgCollector2 方案-${obj.mainInfo.name}.txt`);
	} else {
		saveAs(blob, `WebImgCollector2 规则-${obj.name}.txt`);
	}
}

// f 打开对应网站
function open(url: string) {
	if (!url.trim()) return;
	url = "https://" + url.trim();
	GM_openInTab(url, {
		active: true,
	});
}

// f 粘贴规则
function pasteRule() {
	navigator.clipboard
		.readText()
		.then((dataStr) => {
			console.log("剪贴板文本：", dataStr);
			// 先尝试解析成一个对象
			let obj: any;
			try {
				obj = JSON.parse(dataStr);
			} catch (e) {
				ElNotification({
					type: "error",
					title: "失败",
					message: "剪贴板内容解析失败",
					appendTo: ".web-img-collector__notification",
				});
				return;
			}
			// 如果方案解析失败,则进一步尝试解析为规则
			let rule: Rule | false = false;
			try {
				rule = new Rule(obj);
				// 将解析出来的规则添加到当前编辑中的方案中
				if (
					!patternStore.editingPattern ||
					patternStore.editingPattern.id.includes("#")
				) {
					ElNotification({
						type: "error",
						title: "失败",
						message: "请在方案中进行此操作",
						appendTo: ".web-img-collector__notification",
					});
					return;
				}
				patternStore.editingPattern.rules.push(rule);
				// 设置编辑规则为当前规则
				patternStore.editing.rid = rule.id;
				ElNotification({
					type: "success",
					title: "成功",
					message: "成功解析为规则",
					appendTo: ".web-img-collector__notification",
				});
			} catch (e) {
				// 如果解析失败则提示错误
				ElNotification({
					type: "error",
					title: "失败",
					message: "剪贴板内容不符合规则的数据格式",
					appendTo: ".web-img-collector__notification",
				});
			}
		})
		.catch(() => {
			ElNotification({
				type: "error",
				title: "失败",
				message: "剪贴板内容读取失败",
				appendTo: ".web-img-collector__notification",
			});
		});
}
</script>

<style lang="scss" scoped>
.pattern-form__container {
	& > * {
		margin-bottom: 8px;
	}
	& > :last-child {
		margin-bottom: 0px;
	}
}

:deep(.wic2-card) {
	overflow: visible;
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);
}
:deep(.wic2-card__header),
:deep(.wic2-card__footer) {
	display: flex;
	padding: 8px 20px;
}
:deep(.wic2-card__body) {
	padding-bottom: 0;
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
		:deep(.wic2-input) {
			width: 180px;
		}
		:deep(span) {
			white-space: nowrap;
		}
	}
	.form-card-header-right {
		display: flex;
		margin-left: auto;
	}
}

.pattern-form__container :deep(.wic2-form-item__label) {
	color: black;
}
.pattern-form__container
	:deep(.wic2-input-group__append .wic2-select__wrapper) {
	box-shadow: unset;
}
</style>
