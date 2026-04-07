<template>
	<BaseFlex
		class="pattern-edit__form"
		direction="column"
		:data-theme="globalStore.theme"
	>
		<n-card
			v-if="pattern"
			class="pattern-edit__form__card"
			style="flex-shrink: 0"
			size="small"
		>
			<template #header>
				<div style="display: flex; align-items: center; gap: 8px; height: 36px">
					<n-gradient-text size="16" type="primary" style="align-self: center">
						方案：
					</n-gradient-text>
					<BaseImg
						style="height: 16px; aspect-ratio: 1"
						:src="pattern.mainInfo.icon"
					>
						<template #error-img>
							<icon-oui-app-index-pattern />
						</template>
					</BaseImg>
					<div style="font-size: 14px">
						{{ pattern.backup?.mainInfo.name || pattern.mainInfo.name }}
						{{ pattern.isChange() ? "*" : "" }}
					</div>
					<!-- 方案复制按钮 -->
					<n-button
						text
						style="font-size: 18px"
						type="primary"
						@click="copyToClipboard(pattern)"
					>
						<n-icon>
							<icon-ep-document-copy />
						</n-icon>
					</n-button>
					<!-- 方案下载按钮 -->
					<n-button
						text
						style="font-size: 18px"
						type="info"
						@click="saveToFile(pattern)"
					>
						<n-icon>
							<icon-material-symbols-download />
						</n-icon>
					</n-button>
				</div>
			</template>
			<template #header-extra>
				<BaseFlex :gap="4">
					<n-button
						type="primary"
						size="small"
						@click="pasteRule"
						:disabled="disabled"
					>
						粘贴规则
					</n-button>
					<n-button-group v-if="pattern.isChange()" size="small">
						<n-button type="primary" @click="savePattern"> 保存 </n-button>
						<n-button @click="resetPattern"> 重置 </n-button>
					</n-button-group>
				</BaseFlex>
			</template>
			<!-- 方案表单 -->
			<n-form label-placement="left" :model="pattern" :disabled="disabled">
				<n-form-item
					label="方案名称"
					path="mainInfo.name"
					:show-feedback="false"
				>
					<n-input
						v-model:value="pattern.mainInfo.name"
						placeholder="输入方案名称"
						clearable
					/>
				</n-form-item>
				<n-form-item label="图标" path="mainInfo.icon" :show-feedback="false">
					<n-input-group>
						<n-input
							v-model:value="pattern.mainInfo.icon"
							placeholder="填入图标链接"
							clearable
						>
						</n-input>
						<n-button :focusable="false" :disabled="disabled">
							<template #icon>
								<BaseImg
									style="height: 16px; aspect-ratio: 1"
									:src="pattern.mainInfo.icon"
								>
									<template #error-img>
										<icon-oui-app-index-pattern />
									</template>
								</BaseImg>
							</template>
						</n-button>
					</n-input-group>
				</n-form-item>
				<n-form-item
					v-for="(_host, index) in pattern.mainInfo.matchHost"
					:key="index"
					:label="`匹配域名${
						pattern.mainInfo.matchHost.length > 1 ? index + 1 : ''
					}`"
					:path="`mainInfo.matchHost[${index}]`"
					:show-feedback="false"
				>
					<n-input-group>
						<n-input
							v-model:value="pattern.mainInfo.matchHost[index]"
							placeholder="输入要匹配的域名"
							clearable
						>
						</n-input>
						<n-button
							type="primary"
							@click="openUrl(pattern.mainInfo.matchHost[index])"
							:disabled="disabled"
						>
							打开
						</n-button>
						<n-button @click="addMatchHost(index)" :disabled="disabled">
							新增
						</n-button>
						<n-button
							v-if="pattern.mainInfo.matchHost.length > 1 && index > 0"
							type="error"
							@click="removeMatchHost(index)"
						>
							删除
						</n-button>
					</n-input-group>
				</n-form-item>
				<n-form-item
					label="过滤器"
					path="mainInfo.filter"
					:show-feedback="false"
				>
					<n-input-group style="align-items: center">
						<n-input
							v-model:value="pattern.mainInfo.filter.expression"
							clearable
							placeholder="输入提取表达式"
							style="flex: 2"
						>
							<template #prefix> / </template>
							<template #suffix> / </template>
						</n-input>
						<n-select
							style="width: 150px"
							v-model:value="pattern.mainInfo.filter.flags"
							multiple
							clearable
							:options="regexFlagOptions"
							:render-option="regexFlagRenderOption"
							placeholder="正则修饰符"
						>
						</n-select>
					</n-input-group>
				</n-form-item>
				<n-form-item
					label="标题选择"
					path="mainInfo.filter"
					:show-feedback="false"
				>
					<n-input
						v-model:value="pattern.mainInfo.titleSelector"
						clearable
						placeholder="输入css选择器"
					/>
				</n-form-item>
			</n-form>
		</n-card>
		<!-- 规则表单 -->
		<n-card class="pattern-edit__form__card" content-style="overflow:hidden;">
			<template #header>
				<div style="display: flex; align-items: center; gap: 4px; height: 36px">
					<n-input-group style="align-items: center; gap: 8px">
						<n-gradient-text size="16" type="info"> 规则： </n-gradient-text>
						<n-input
							v-model:value="rule.name"
							clearable
							style="width: clamp(100px, 250px, 100% - 60px)"
							placeholder="填入规则名称"
							:disabled="disabled"
						>
							<template #prefix>
								<icon-material-symbols-data-object-rounded />
							</template>
						</n-input>
						<n-switch
							v-if="!disabled"
							v-model:value="rule.enable"
							:round="false"
							style="margin-right: 8px; font-size: 14px"
						>
							<template #checked> 启用 </template>
							<template #unchecked> 禁用 </template>
						</n-switch>
						<!-- 规则复制按钮 -->
						<n-button
							text
							style="font-size: 18px"
							type="primary"
							@click="copyToClipboard(rule)"
						>
							<n-icon>
								<icon-ep-document-copy />
							</n-icon>
						</n-button>
						<!-- 规则下载按钮 -->
						<n-button
							text
							style="font-size: 18px"
							type="info"
							@click="saveToFile(rule)"
						>
							<n-icon>
								<icon-material-symbols-download />
							</n-icon>
						</n-button>
					</n-input-group>
				</div>
			</template>
			<template #header-extra>
				<n-button-group v-if="rule.isChange()" size="small">
					<n-button type="primary" @click="saveRule"> 保存 </n-button>
					<n-button @click="resetRule"> 重置 </n-button>
				</n-button-group>
			</template>
			<template #default>
				<BaseTabs style="overflow: hidden; height: 100%">
					<BaseTabPane
						:label="`约束区域${rule?.isChange('region') ? '*' : ''}`"
						name="region"
					>
						<RegionForm :rule="rule"></RegionForm>
					</BaseTabPane>
					<BaseTabPane
						:label="`匹配：源(必填)${rule?.isChange('source') ? '*' : ''}`"
						name="source"
					>
						<SourceForm :rule="rule"></SourceForm>
					</BaseTabPane>
					<BaseTabPane
						:label="`匹配：预览源${rule?.isChange('preview') ? '*' : ''}`"
						name="preview"
					>
						<PreviewForm :rule="rule"></PreviewForm>
					</BaseTabPane>
					<BaseTabPane
						:label="`匹配：描述${rule?.isChange('description') ? '*' : ''}`"
						name="description"
					>
						<DescriptionForm :rule="rule"></DescriptionForm>
					</BaseTabPane>
				</BaseTabs>
			</template>
		</n-card>
	</BaseFlex>
</template>

<script setup lang="ts">
import { GM_openInTab } from "$";
import { defaultPattern, Pattern, Rule } from "@/models";
import { useNotification } from "@/plugin/naive-ui";
import { useGlobalStore, usePatternStore } from "@/stores";
import { useClipboard } from "@vueuse/core";
import { BaseFlex, BaseImg, BaseTabPane, BaseTabs } from "base-ui";
import { saveAs } from "file-saver";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import DescriptionForm from "./form/description-form.vue";
import PreviewForm from "./form/preview-form.vue";
import RegionForm from "./form/region-form.vue";
import SourceForm from "./form/source-form.vue";
import { regexFlagOptions, regexFlagRenderOption } from "./publicData";

const notification = useNotification();

const globalStore = useGlobalStore();

const patternStore = usePatternStore();
const { editingPattern, editingRule } = storeToRefs(patternStore);
const { saveUserPatternInfo } = patternStore;

const pattern = computed(() => {
	return editingPattern.value || new Pattern(defaultPattern);
});

const rule = computed(() => {
	return editingRule.value || new Rule();
});

// j 是否禁用
const disabled = computed(() => {
	return pattern.value.id.includes("#");
});

// f 拷贝方案(或规则)至剪贴板
function copyToClipboard(obj: Pattern | Rule) {
	const { copy } = useClipboard();
	const rowData = JSON.stringify(obj.toRaw({ includeId: false }), null, 2);
	copy(rowData)
		.then(() => {
			notification.success({
				title: "成功",
				content:
					obj instanceof Pattern
						? `方案“${obj.mainInfo.name}”拷贝成功！`
						: `规则“${obj.name}”拷贝成功！`,
				duration: 3000,
			});
		})
		.catch(() => {
			notification.error({
				title: "失败",
				content:
					obj instanceof Pattern
						? `方案“${obj.mainInfo.name}”拷贝失败`
						: `规则“${obj.name}”拷贝失败`,
				duration: 3000,
			});
		});
}

// f 保存规则
function saveRule() {
	rule.value.backupData();
	// patternDB.set(pattern.value.id, pattern.value.toRaw());
	saveUserPatternInfo(); // 备份后进行数据存储
}

// f 重置规则
function resetRule() {
	rule.value.recoveryData();
}

// f 保存方案
function savePattern() {
	pattern.value.backupData();
	// patternDB.set(pattern.value.id, pattern.value.toRaw());
	saveUserPatternInfo(); // 备份后进行数据存储
}

// f 重置方案
function resetPattern() {
	pattern.value.recoveryData();
}

// f 保存方案(或规则)至本地文件
function saveToFile(obj: Pattern | Rule) {
	const rowData = JSON.stringify(obj.toRaw({ includeId: true }), null, 2);
	// 将文本转为blob
	const blob = new Blob([rowData], { type: "text/plain;charset=utf-8" });
	if (obj instanceof Pattern) {
		saveAs(blob, `Resource Extractor Monkey 方案-${obj.mainInfo.name}.txt`);
	} else {
		saveAs(blob, `Resource Extractor Monkey 规则-${obj.name}.txt`);
	}
}

// f 打开对应网站
function openUrl(url: string) {
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
			// console.log("剪贴板文本：", dataStr);
			// 先尝试解析成一个对象
			let obj: Object;
			try {
				obj = JSON.parse(dataStr);
				if (
					!obj.hasOwnProperty("source") &&
					!obj.hasOwnProperty("preview") &&
					!obj.hasOwnProperty("description")
				)
					throw new Error();
			} catch (e) {
				notification.error({
					title: "失败",
					content: "剪贴板内容解析失败",
					duration: 3000,
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
					notification.error({
						title: "失败",
						content: "请在方案中进行此操作",
						duration: 3000,
					});
					return;
				}
				patternStore.editingPattern.rules.push(rule);
				// 设置编辑规则为当前规则
				patternStore.editing.rid = rule.id;
				notification.success({
					title: "成功",
					content: "成功解析为规则",
					duration: 3000,
				});
			} catch (e) {
				// 如果解析失败则提示错误
				notification.error({
					title: "失败",
					content: "剪贴板内容不符合规则的数据格式",
					duration: 3000,
				});
			}
		})
		.catch(() => {
			notification.error({
				title: "失败",
				content: "剪贴板内容读取失败",
				duration: 3000,
			});
		});
}

// f 新增匹配域名
function addMatchHost(index: number) {
	editingPattern.value?.mainInfo.matchHost.splice(index + 1, 0, "");
}

// f 删除匹配域名
function removeMatchHost(index: number) {
	editingPattern.value?.mainInfo.matchHost.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.pattern-edit__form {
	height: 100%;
	& > &__card {
		margin-bottom: 4px;
		overflow: hidden;
	}
	& > &__card:last-child {
		margin-bottom: 0px;
	}

	:deep(.re-n-card),
	:deep(.re-n-list) {
		background: rgba(getTheme(light, background), 0.35);
	}

	:deep(.re-n-form-item) {
		margin-bottom: 8px;
	}

	:deep(.re-input-group__append .re-select__wrapper) {
		box-shadow: unset;
	}

	:deep(.re-card) {
		overflow: visible;
		background: rgba(getTheme(light, background), 0.35);
		backdrop-filter: getStyle(backdrop-filter);
	}
	:deep(.re-card__header),
	:deep(.re-card__footer) {
		display: flex;
		padding: 8px 20px;
	}
	:deep(.re-card__body) {
		padding-bottom: 0;
	}
}

.pattern-edit__form[data-theme="dark"] {
	:deep(.re-n-card),
	:deep(.re-n-list) {
		background: rgba(getTheme(dark, background), 0.35);
	}
	:deep(.re-card) {
		background: rgba(getTheme(dark, background), 0.35);
	}
}

.form-card-header {
	font-size: 14px;
	width: 100%;

	.form-card-header-left {
		display: flex;
		align-items: center;
		gap: 8px;
		:deep(.re-input) {
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
</style>
