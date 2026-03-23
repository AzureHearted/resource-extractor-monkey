<template>
	<span class="base-highlight-text">
		<template v-for="(part, index) in segments" :key="index">
			<mark v-if="part.isMatch" class="base-highlight-text__target">{{
				part.text
			}}</mark>
			<span v-else class="base-highlight-text__normal">{{ part.text }}</span>
		</template>
	</span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		/** 原始文本 */
		text: string;
		/** 要高亮的关键词 */
		keyword?: string;
	}>(),
	{
		keyword: "",
	},
);

// j 拆分后片段
const segments = computed(() => {
	const { text, keyword } = props;
	if (!keyword || !text) {
		return [{ text, isMatch: false }];
	}

	// 处理多个关键词的情况
	const keywordList = (keyword.split("|") || []).map((k) => {
		// 1. 转义关键词中的正则特殊字符 (如 . * + ? 等)
		return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	});

	// 1. 转义关键词中的正则特殊字符 (如 . * + ? 等)
	// const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const safeKeyword = keywordList.join("|");

	// 2. 使用正则表达式拆分，'gi' 表示全局匹配并忽略大小写
	// () 捕获组会让 split 保留匹配到的部分
	const regex = new RegExp(`(${safeKeyword})`, "gi");
	const parts = text.split(regex);

	// 3. 将拆分后的字符串转换为带状态的对象
	return parts
		.filter((p) => p !== "")
		.map((p) => ({
			text: p,
			isMatch: keywordList.some((k) => p.toLowerCase() === k.toLowerCase()),
		}));
});
</script>

<style lang="scss" scoped>
/* 高亮文本的样式 */
.base-highlight-text__target {
	background-color: hsl(52, 100%, 50%); /* 明亮的黄色 */
	color: #333;
	padding: 0 1px;
	border-radius: 2px;
	font-style: normal; /* 覆盖 mark 默认倾斜 */
}
</style>
