// 匹配方案
export interface BasePattern {
	id: string; // 方案id
	mainInfo: BaseMainInfo; // 方案信息
	rules: BaseRule[]; // 可以有多条匹配规则
	state: BaseStatus; // 状态
	backup: PatternRowData | null;
}

export interface PatternRowData {
	id?: string; // 方案id
	mainInfo: BaseMainInfo; // 方案信息
	rules: BaseRuleRowData[]; // 可以有多条匹配规则
}

// 主要信息
export interface BaseMainInfo {
	name: string; //s 规则名称
	host: string; //s 域名
	matchHost: string[]; //s 匹配域名列表
	// 路径过滤器
	filter: Pick<BaseRegex, "expression" | "flags">;
	icon: string; //s 站点图标链接
	titleSelector: string; //s 标题选择器
	note: string; //方案备注
}

// 匹配规则
export interface BaseRule {
	id: string; // 规则id
	enable: boolean; //是否启用
	name: string; // 规则名称
	region: BaseMatchRegion; // 区域匹配
	source: BaseMatchSource; // 源匹配
	preview: BaseMatchPreview; // 预览源匹配
	description: BaseMatchDescription; // 描述匹配
	filter: BaseFilter; // 过滤器
	state: BaseStatus; // 状态
	backup: BaseRuleRowData | null;
}

export interface BaseRuleRowData {
	id?: string; // 规则id
	enable: boolean; //是否启用
	name: string; // 规则名称
	region: BaseMatchRegion; // 区域匹配
	preview: BaseMatchPreview; // 预览源匹配
	source: BaseMatchSource; // 源匹配
	description: BaseMatchDescription; // 描述匹配
	filter: BaseFilter; // 过滤器
}

// 基础匹配接口
export interface BaseMatch {
	selector: string; // 选择器(多个时用竖线“|”分隔)
	infoType:
		| "value"
		| "attribute"
		| "property"
		| "innerText"
		| "innerHTML"
		| "outerHTML";
	name: string; // 属性名(多个时用竖线“|”分隔)
	fix: BaseFix[]; // 修正
}

//s 匹配区域
export interface BaseMatchRegion extends Pick<BaseMatch, "selector"> {
	//s 时候启用区域限定(开启后将以该项指定的区域作为起点查找查询其他项目)
	enable: boolean; // 是否开启
}

// s 匹配来源
export interface BaseMatchSource extends BaseMatch {}

// s 匹配预览来源
export interface BaseMatchPreview extends BaseMatch {
	enable: boolean;
	origin: "custom" | "region" | "source"; // 获取来源
}

// s 匹配描述内容
export interface BaseMatchDescription extends BaseMatch {
	enable: boolean;
	origin: "custom" | "region" | "source" | "preview"; // 获取来源
}

// 基础正则接口
interface BaseRegex {
	expression: string; //s 正则表达式
	replaceTo: string; //s 替换结果
	flags: string[]; //s 正则修饰符
}

//s 正则提取修正类型的接口
interface BaseMatchRegExtract extends Omit<BaseRegex, "replaceTo"> {
	type: "regex-extract";
}

//s 正则替换类型的接口
interface BaseMatchRegReplace extends BaseRegex {
	type: "regex-replace";
}
//s 获取页面并提取内容
interface BaseMatchFetchPageAndExtractContent extends Omit<BaseMatch, "fix"> {
	type: "fetch-page-and-extract-content";
}

//s 正则修正类型
export type BaseFix =
	| BaseMatchRegExtract
	| BaseMatchRegReplace
	| BaseMatchFetchPageAndExtractContent;

//s 匹配过滤器
export interface BaseFilter {
	formats: string[]; //格式列表
	width: [number, number]; // 宽度范围
	height: [number, number]; // 高度范围
}

//? 规则状态
export interface BaseStatus {
	editing: boolean;
}
