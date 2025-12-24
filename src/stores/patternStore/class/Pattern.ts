import { cloneDeep, isEqual } from "@/plugin/lodash";
import type {
	BasePattern,
	BaseStatus,
	BaseMainInfo,
	BaseRule,
	PatternRowData,
} from "../interface/Pattern";
import { Rule } from "./Rule";
import { getFavicon } from "@/utils/common";

// 匹配方案
export class Pattern implements BasePattern {
	public readonly id: string; // 方案id
	public mainInfo: BaseMainInfo = {
		name: "新方案",
		host: location.hostname,
		matchHost: [],
		icon: getFavicon(),
		titleSelector: "title",
		filter: {
			expression: "",
			flags: [],
		},
		note: "",
	};
	public rules: Rule[]; // 规则列表
	public state: BaseStatus = {
		editing: false,
	};

	public backup: BasePattern["backup"] | null = null;

	// s 构造
	constructor(options?: Partial<BasePattern>) {
		this.id = options?.id || crypto.randomUUID(); // 为规则生成(拷贝)id
		this.mainInfo = {
			...this.mainInfo,
			...options?.mainInfo,
		};
		this.rules = (options?.rules || []).map((x) => new Rule(x));
		this.state = {
			...this.state,
			...options?.state,
		};

		// 如果没有规则就创建规则
		if (!this.rules.length) {
			this.createRule();
		} else {
			this.rules = this.rules.map((r) => new Rule(r));
		}

		// ! 旧版兼容性设置
		if (!this.mainInfo.matchHost.length) {
			this.mainInfo.matchHost.push(this.mainInfo.host);
		}
		// 构造后进行数据备份
		this.backupData();
	}

	// 创建规则
	public createRule(options?: Partial<BaseRule>) {
		const rule = new Rule(options);
		this.rules.push(rule);
		return rule.id;
	}

	// 删除规则
	public deleteRule(id: string) {
		// 查询下标
		const index = this.rules.findIndex((rule) => rule.id === id);
		if (index >= 0) {
			this.rules.splice(index, 1);
		}
	}

	// 获取纯数据对象

	public getRowData(options?: {
		type?: "now" | "backup";
		includeId?: boolean;
	}): PatternRowData {
		const defaultOptions: { type: "now" | "backup"; includeId: boolean } = {
			type: "now",
			includeId: true,
		};
		const { includeId, type } = { ...defaultOptions, ...options };
		if (type === "now") {
			return cloneDeep({
				id: includeId ? this.id : undefined,
				mainInfo: this.mainInfo,
				rules: this.rules.map((r) =>
					r.getRowData({
						includeId,
					})
				),
			});
		} else {
			return cloneDeep({
				id: includeId ? this.backup?.id || this.id : undefined,
				mainInfo: this.backup?.mainInfo || this.mainInfo,
				rules: this.rules.map((r) =>
					r.getRowData({
						includeId,
					})
				),
			});
		}
	}

	// 数据备份
	public backupData() {
		this.rules.forEach((r) => r.backupData());
		this.backup = {
			id: cloneDeep(this.id),
			mainInfo: cloneDeep(this.mainInfo),
			rules: cloneDeep(this.rules),
		};
	}

	// 恢复数据
	public recoveryData() {
		this.rules.forEach((r) => r.recoveryData());
		// 如果备份存在才进行恢复
		if (this.backup) {
			this.mainInfo = cloneDeep(this.backup.mainInfo);
			this.rules = cloneDeep(this.backup.rules).map((r) => new Rule(r));
		}
	}

	// 判断是否发生更改
	public isChange() {
		return (
			!isEqual(this.mainInfo, cloneDeep(this.backup?.mainInfo)) ||
			this.rules.some((x) => x.isChange()) ||
			this.rules.length !== this.backup?.rules.length
		);
	}

	// 获取JSON
	public getJson() {
		return JSON.stringify(this.getRowData());
	}
}

// 默认方案
export const defaultPattern = new Pattern({
	id: "#",
	mainInfo: {
		name: "默认方案",
		host: "",
		matchHost: [],
		icon: "",
		titleSelector: "title",
		filter: {
			expression: "",
			flags: [],
		},
		note: "",
	},
	rules: [
		new Rule({
			id: "#img#",
			enable: true,
			name: "图片",
			region: {
				enable: true,
				selector:
					'img[data-src*=\\.jpg],img[data-src*=\\.jpeg],img[data-src*=\\.png],img[data-src*=\\.webp],img[data-src*=\\.avif],img[src*=\\.jpg],img[src*=\\.jpeg],img[src*=\\.png],img[src*=\\.webp],img[src*=\\.avif],a[href*=\\.jpg]:has(img),a[href*=\\.png]:has(img),a[href*=\\.webp]:has(img),a[href*=\\.jpeg]:has(img),meta[property="og:image"]',
			},
			source: {
				selector: "",
				infoType: "attribute",
				name: "href|srcset|data-src|src|content",
				fix: [],
			},
		}),
		new Rule({
			id: "#video#",
			enable: true,
			name: "视频",
			region: {
				enable: true,
				selector: "video>source[src],video[src]",
			},
			source: {
				selector: "",
				infoType: "property",
				name: "src",
				fix: [],
			},
		}),
		new Rule({
			id: "#a-img#",
			enable: true,
			name: "a标签内含img",
			region: {
				enable: true,
				selector: "a:has(>img)",
			},
			source: {
				selector: "",
				infoType: "property",
				name: "href",
				fix: [],
			},
			preview: {
				enable: true,
				origin: "custom",
				selector: "&>img",
				infoType: "attribute",
				name: "srcset|data-src|src|data-srcset",
				fix: [],
			},
		}),
		new Rule({
			id: "#a-picture#",
			enable: true,
			name: "a标签内含picture",
			region: {
				enable: true,
				selector: "a:has(>picture)",
			},
			source: {
				selector: "",
				infoType: "property",
				name: "href",
				fix: [],
			},
			preview: {
				enable: true,
				origin: "custom",
				selector: "&>picture>img,&>picture>source",
				infoType: "attribute",
				name: "data-src|srcset|src|data-srcset",
				fix: [],
			},
		}),
	],
});
