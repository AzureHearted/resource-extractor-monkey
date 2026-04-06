import type { Meta } from "@/models/Card";
import type { Status } from "@/models/Pattern/interface/Pattern";

// 匹配规则
export interface Rule {
	id: string; // 规则id
	enable: boolean; //是否启用
	name: string; // 规则名称
	region: Region; // 区域匹配
	source: Source; // 源匹配
	preview: Preview; // 预览源匹配
	description: Description; // 描述匹配
	filter: Filter; // 过滤器
	state: Status; // 状态
	backup: RawRule | null;
}

export interface RawRule {
	id?: string; // 规则id
	enable: boolean; //是否启用
	name: string; // 规则名称
	region: Region; // 区域匹配
	preview: Preview; // 预览源匹配
	source: Source; // 源匹配
	description: Description; // 描述匹配
	filter: Filter; // 过滤器
}

// 基础匹配接口
export interface BaseMatch {
	/** 选择器(多个时用竖线“|”分隔) */
	selector: string;
	infoType:
		| "value"
		| "attribute"
		| "property"
		| "innerText"
		| "innerHTML"
		| "outerHTML";
	/** 属性名(多个时用竖线“|”分隔) */
	name: string;
	/** 修正 */
	fix: BaseFix[];
	/** 断言资源类型 (为null或undefined时会自动进行判断) */
	assertionType: "auto" | Meta["type"];
}

// s 匹配区域
export interface Region extends Pick<BaseMatch, "selector"> {
	// s 时候启用区域限定(开启后将以该项指定的区域作为起点查找查询其他项目)
	enable: boolean; // 是否开启
}

// s 匹配来源
export interface Source extends BaseMatch {}

// s 匹配预览来源
export interface Preview extends BaseMatch {
	enable: boolean;
	origin: "custom" | "region" | "source"; // 获取来源
}

// s 匹配描述内容
export interface Description extends Omit<BaseMatch, "assertionType"> {
	enable: boolean;
	origin: "custom" | "region" | "source" | "preview"; // 获取来源
}

// 基础正则接口
export interface BaseRegex {
	expression: string; // s 正则表达式
	replaceTo: string; // s 替换结果
	flags: string[]; // s 正则修饰符
}

// s 正则提取修正类型的接口
interface BaseMatchRegExtract extends Omit<BaseRegex, "replaceTo"> {
	type: "regex-extract";
}

// s 正则替换类型的接口
interface BaseMatchRegReplace extends BaseRegex {
	type: "regex-replace";
}
// s 获取页面并提取内容
interface BaseMatchFetchPageAndExtractContent extends Omit<
	BaseMatch,
	"fix" | "assertionType"
> {
	type: "fetch-page-and-extract-content";
}

// s 正则修正类型
export type BaseFix =
	| BaseMatchRegExtract
	| BaseMatchRegReplace
	| BaseMatchFetchPageAndExtractContent;

// s 匹配过滤器
export interface Filter {
	formats: string[]; //格式列表
	width: [number, number]; // 宽度范围
	height: [number, number]; // 高度范围
}
