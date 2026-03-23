import { cloneDeep, isEqual } from "@/plugin/lodash";
import type {
	Pattern as IPattern,
	Status,
	RawPattern,
} from "./interface/Pattern";
import type { Rule as IRule } from "../Rule/interface/Rule";
import { Rule } from "../Rule/Rule";
import { getFavicon } from "@/utils/common";

// 匹配方案
export class Pattern implements IPattern {
	public readonly id: string; // 方案id
	public mainInfo: IPattern["mainInfo"] = {
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
	public state: Status = {
		editing: false,
	};

	public backup: IPattern["backup"] | null = null;

	// s 构造
	constructor(options?: Partial<IPattern>) {
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
	public createRule(options?: Partial<IRule>) {
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

	public toRaw(options?: {
		type?: "now" | "backup";
		includeId?: boolean;
	}): RawPattern {
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
					r.toRaw({
						includeId,
					}),
				),
			});
		} else {
			return cloneDeep({
				id: includeId ? this.backup?.id || this.id : undefined,
				mainInfo: this.backup?.mainInfo || this.mainInfo,
				rules: this.rules.map((r) =>
					r.toRaw({
						includeId,
					}),
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
	public isChange(key?: keyof RawPattern) {
		if (!this.backup) return false;

		if (key) {
			return !isEqual(this[key], this.backup[key]);
		}

		// 主信息
		if (!isEqual(this.mainInfo, this.backup.mainInfo)) {
			return true;
		}

		// 数量变化
		if (this.rules.length !== this.backup.rules.length) {
			return true;
		}

		// 顺序变化
		const currentIds = this.rules.map((r) => r.id);
		const backupIds = this.backup.rules.map((r) => r.id);

		if (!isEqual(currentIds, backupIds)) {
			return true;
		}

		// 子项变化
		return this.rules.some((rule) => rule.isChange());
	}

	// 获取JSON
	public toJson() {
		return this.toRaw();
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
				assertionType: "auto",
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
				assertionType: "auto",
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
				assertionType: "auto",
			},
			preview: {
				enable: true,
				origin: "custom",
				selector: "&>img",
				infoType: "attribute",
				name: "srcset|data-src|src|data-srcset",
				fix: [],
				assertionType: "auto",
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
				assertionType: "auto",
			},
			preview: {
				enable: true,
				origin: "custom",
				selector: "&>picture>img,&>picture>source",
				infoType: "attribute",
				name: "data-src|srcset|src|data-srcset",
				fix: [],
				assertionType: "auto",
			},
		}),
	],
});
