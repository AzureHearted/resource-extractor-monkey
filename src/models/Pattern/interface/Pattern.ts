import type { BaseRegex, RawRule, Rule } from "../../Rule/interface/Rule";

// 匹配方案
export interface Pattern {
	id: string; // 方案id
	mainInfo: MainInfo; // 方案信息
	rules: Rule[]; // 可以有多条匹配规则
	state: Status; // 状态
	backup: RawPattern | null;
}

export interface RawPattern {
	id?: string; // 方案id
	mainInfo: MainInfo; // 方案信息
	rules: RawRule[]; // 可以有多条匹配规则
}

// 主要信息
interface MainInfo {
	name: string; // s 规则名称
	host: string; // s 域名
	matchHost: string[]; // s 匹配域名列表
	// 路径过滤器
	filter: Pick<BaseRegex, "expression" | "flags">;
	icon: string; // s 站点图标链接
	titleSelector: string; // s 标题选择器
	note: string; //方案备注
}

// ? 规则状态
export interface Status {
	editing: boolean;
}
