<template>
	<Scrollbar show-back-top-button back-to-top-behavior="smooth">
		<div class="style-sheet-manager__container">
			<!-- 获取当前页面样式表 -->
			<n-card embedded class="style-sheet-manager__toolbar">
				<n-flex :size="8" align="center">
					<n-button type="primary" @click="getStyleSheets">
						获取页面样式表
					</n-button>
					<n-badge
						:value="filteredStyleSheetList.length"
						:max="999"
						type="info"
					>
						<n-switch
							v-model:value="filterThisScriptStyle"
							@update:value="getStyleSheets"
						>
							<template #checked> 已过滤当前脚本样式 </template>
							<template #unchecked> 未过滤当前脚本样式 </template>
						</n-switch>
					</n-badge>
					<n-form-item :show-label="false" :show-feedback="false">
						<n-input
							v-model:value="keyword"
							type="text"
							placeholder="关键词检索"
							clearable
						/>
					</n-form-item>
				</n-flex>
			</n-card>
			<n-collapse accordion>
				<transition-group name="fade">
					<n-collapse-item
						v-for="item in filteredStyleSheetList"
						:key="item.index"
					>
						<template #header>
							<n-flex :size="8" align="center">
								<span>
									{{ item.index }}
								</span>
								<n-flex vertical :size="4">
									<div v-for="key in Object.keys(item.attributes)" :key="key">
										<n-tag type="info">{{ key }}:</n-tag>
										{{ item.attributes[key] }}
									</div>
								</n-flex>
							</n-flex>
						</template>
						<template #header-extra>
							<n-flex :size="8" align="center" @click.stop>
								<n-button
									type="error"
									@click="styleSheetList.splice(item.index, 1)"
								>
									删除
								</n-button>
								<n-switch
									v-model:value="item.disabled"
									:checked-value="false"
									:unchecked-value="true"
									:rail-style="railStyle"
									@update:value="getStyleSheets"
								>
									<template #checked> 已启用 </template>
									<template #unchecked> 已禁用 </template>
								</n-switch>
								<n-tag :type="item.dom?.tagName === 'STYLE' ? 'info' : 'error'">
									{{ item.dom?.tagName.toLocaleLowerCase() }}
								</n-tag>
							</n-flex>
						</template>
						<div v-if="item.dom?.tagName === 'STYLE'">
							<div v-for="(rule, rIndex) in item.cssRules" :key="rIndex">
								{{ (rule as CSSStyleRule).selectorText }}
							</div>
							<n-code
								:code="item.dom.textContent || ''"
								language="css"
								show-line-numbers
							/>
						</div>
						<div v-if="item.ownerNode?.nodeName === 'LINK'">
							<n-code
								:code="item.href || ''"
								language="css"
								show-line-numbers
							/>
						</div>
					</n-collapse-item>
				</transition-group>
			</n-collapse>
		</div>
	</Scrollbar>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from "vue";
import type { CSSProperties } from "vue";

import Scrollbar from "@/components/base/base-scrollbar.vue";

// 样式表对象接口
interface StyleSheet extends CSSStyleSheet {
	index: number;
	dom: HTMLElement | null;
	attributes: Record<string, string>;
}

onMounted(() => {
	// console.log("样式管理器挂载！");
	// 组件挂载完成后就获取样式表
	// getStyleSheets();
});
onActivated(() => {
	// getStyleSheets();
});

const styleSheetList = ref<StyleSheet[]>([]);
const keyword = ref(""); //检索关键词
const filterThisScriptStyle = ref(true); //是否过滤掉当前脚本的样式
// 过滤后的样式表
const filteredStyleSheetList = computed<StyleSheet[]>(() => {
	return styleSheetList.value.filter((s) => {
		let isMatch: boolean = true;
		const dom = s.dom;
		if (dom?.tagName === "STYLE") {
			const cssRules = s.cssRules;
			// console.log("cssRules", cssRules);
			if (keyword.value.trim()) {
				const content = dom.textContent;
				isMatch =
					isMatch &&
					!!content &&
					(content
						.toLocaleLowerCase()
						.includes(keyword.value.toLocaleLowerCase()) ||
						dom.tagName
							.toLocaleLowerCase()
							.includes(keyword.value.toLocaleLowerCase()));
			}

			if (filterThisScriptStyle.value) {
				isMatch =
					isMatch &&
					![...cssRules].some((r) => {
						const selectorText = r.cssText;
						return new RegExp(/\.(re-|var-)/g).test(selectorText);
					});
			}
		} else {
			isMatch = true;
			if (keyword.value.trim()) {
				const content = s.href;
				isMatch =
					isMatch &&
					!!content &&
					(content.toLocaleLowerCase().includes(keyword.value) ||
						(!!dom &&
							dom.tagName
								.toLocaleLowerCase()
								.includes(keyword.value.toLocaleLowerCase())));
			}
		}
		return isMatch;
	});
});

// 获取页面样式表
const getStyleSheets = () => {
	const styleSheetsList = [...document.styleSheets].map((sh, index) => {
		(sh as StyleSheet).index = index;
		(sh as StyleSheet).dom = sh.ownerNode as HTMLElement;
		(sh as StyleSheet).attributes = !sh.ownerNode
			? {}
			: [...(sh.ownerNode as HTMLElement).attributes].reduce(
					(prev, curr) => {
						prev[curr.name] = curr.value;
						return prev;
					},
					{} as Record<string, string>,
				);
		return sh as StyleSheet;
	});
	styleSheetList.value = styleSheetsList;
};

// 切换按钮轨道渲染
const railStyle = ({
	focused,
	checked,
}: {
	focused: boolean;
	checked: boolean;
}) => {
	const style: CSSProperties = {};
	if (checked) {
		if (focused) {
			style.boxShadow = "0 0 0 2px #2080f040";
		}
	} else {
		style.background = "#d03050";
		if (focused) {
			style.boxShadow = "0 0 0 2px #d0305040";
		}
	}
	return style;
};
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
	margin: unset;
}

.style-sheet-manager__container {
	box-sizing: border-box;
	display: flex;
	flex-flow: column;
	gap: 8px;
	padding: 4px;
}
.style-sheet-manager__container > .style-sheet-manager__toolbar.re-n-card {
	box-sizing: border-box;
	position: sticky;
	top: 4px;
	z-index: 2;
	width: fit-content;
	max-width: 100%;
	background: white;

	:deep(.re-n-card__content) {
		padding: 4px;
	}
}

/* 1. 声明过渡效果 */
.fade-move,
.fade-enter-active,
.fade-leave-active {
	transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
	* {
		transition: unset !important;
		animation: unset !important;
	}
}

/* 2. 声明进入和离开的状态 */
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: scaleY(0.01) translate(30px, 0);
}

/* 3. 确保离开的项目被移除出了布局流
      以便正确地计算移动时的动画效果。 */
.fade-leave-active {
	position: absolute;
	* {
		transition: unset !important;
		animation: unset !important;
	}
}
</style>
