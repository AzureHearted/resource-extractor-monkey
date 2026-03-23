import type { BaseFix, BaseMatch } from "@/models/Rule/interface/Rule";
import { NSelect, NTooltip, type SelectOption } from "naive-ui";
import { h, type VNode } from "vue";

// s 匹配类型选项
export const matchTypeOptions: InstanceType<typeof NSelect>["options"] = [
	{
		label: "值",
		value: "value",
	},
	{
		label: "Attribute属性",
		value: "attribute",
	},
	{
		label: "Property属性",
		value: "property",
	},
	{
		label: "innerText 内部文本",
		value: "innerText",
	},
	{
		label: "innerHTML 内部HTML",
		value: "innerHTML",
	},
	{
		label: "outerHTML 全部HTML",
		value: "outerHTML",
	},
];

// s 修正类型选项
export const fixTypeOptions: {
	label: string;
	key: BaseFix["type"];
}[] = [
	{
		label: "正则提取",
		key: "regex-extract",
	},
	{
		label: "正则替换",
		key: "regex-replace",
	},
	{
		label: "抓取页面",
		key: "fetch-page-and-extract-content",
	},
];

// s 正则表达式选项
export const regexFlagOptions: SelectOption[] = [
	{
		label: "i",
		tips: "忽略大小写，匹配大小写时不匹配",
		value: "i",
	},
	{
		label: "s",
		tips: "单行模式，. 匹配换行符，^ 匹配字符串开始，$ 匹配字符串结束",
		value: "s",
	},
];

// f 正则表达式选项渲染函数
export function regexFlagRenderOption({
	node,
	option,
}: {
	node: VNode;
	option: SelectOption;
}) {
	return h(
		NTooltip,
		{
			showArrow: false,
			flip: true,
			placement: "left",
			width: 250,
		},
		{
			trigger: () => node,
			default: () => `${option.tips}`,
		},
	);
}

// s 匹配类型选项
export const metaTypeOptions: (SelectOption & {
	value: BaseMatch["assertionType"];
})[] = [
	{
		label: "自动判断",
		value: "auto",
	},
	{
		label: "图片",
		value: "image",
	},
	{
		label: "视频",
		value: "video",
	},
	{
		label: "音频",
		value: "audio",
	},
	{
		label: "压缩包",
		value: "zip",
	},
	{
		label: "网页",
		value: "html",
	},
];
