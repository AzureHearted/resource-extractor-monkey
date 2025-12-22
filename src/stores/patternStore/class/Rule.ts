import { cloneDeep, isEqual } from "@/plugin/lodash";
import type {
	BaseMatchDescription,
	BaseMatchPreview,
	BaseMatchRegion,
	BaseRule,
	BaseMatchSource,
	BaseFilter,
	BaseFix,
	BaseStatus,
	BaseRuleRowData,
} from "../interface/Pattern";

export class Rule implements BaseRule {
	public readonly id: string;
	public enable: boolean = true;
	public name: string = "新规则";
	public region: BaseMatchRegion = {
		enable: false,
		selector: "",
	};
	public source: BaseMatchSource = {
		selector: "",
		infoType: "property",
		name: "",
		fix: [],
	};
	public preview: BaseMatchPreview = {
		enable: false,
		origin: "source",
		selector: "",
		infoType: "property",
		name: "",
		fix: [],
	};
	public description: BaseMatchDescription = {
		enable: false,
		origin: "source",
		selector: "",
		infoType: "innerText",
		name: "",
		fix: [],
	};
	public filter: BaseFilter = {
		formats: [],
		width: [0, -1],
		height: [0, -1],
	};
	public state: BaseStatus = {
		editing: false,
	};
	public backup: BaseRuleRowData | null = null;

	constructor(options?: Partial<BaseRule>) {
		this.id = options?.id || crypto.randomUUID();
		if (options?.enable !== undefined) {
			this.enable = options?.enable;
		}
		this.name = options?.name || this.name;
		this.region = {
			...this.region,
			...options?.region,
		};
		this.source = {
			...this.source,
			...options?.source,
		};
		this.preview = {
			...this.preview,
			...options?.preview,
		};
		this.description = {
			...this.description,
			...options?.description,
		};
		this.filter = {
			...this.filter,
			...options?.filter,
		};
		this.state = {
			...this.state,
			...options?.state,
		};
		this.backupData();
	}

	// 获取纯数据对象
	public getRowData(options?: {
		type?: "now" | "backup";
		includeId?: boolean;
	}): BaseRuleRowData {
		const defaultOptions: {
			type: "now" | "backup";
			includeId: boolean;
		} = {
			type: "now",
			includeId: true,
		};
		const { includeId, type } = { ...defaultOptions, ...options };
		if (type === "now") {
			return cloneDeep({
				id: includeId ? this.id : undefined,
				enable: this.enable,
				name: this.name,
				region: this.region,
				source: this.source,
				preview: this.preview,
				description: this.description,
				filter: this.filter,
			});
		} else {
			return cloneDeep({
				id: includeId ? this.backup?.id || this.id : undefined,
				enable: this.backup?.enable || this.enable,
				name: this.backup?.name || this.name,
				region: this.backup?.region || this.region,
				source: this.backup?.source || this.source,
				preview: this.backup?.preview || this.preview,
				description: this.backup?.description || this.description,
				filter: this.backup?.filter || this.filter,
			});
		}
	}

	// 数据备份
	public backupData() {
		this.backup = this.getRowData();
	}

	// 恢复数据
	public recoveryData() {
		// 如果备份存在才进行恢复
		if (this.backup) {
			this.name = cloneDeep(this.backup.name);
			this.region = cloneDeep(this.backup.region);
			this.source = cloneDeep(this.backup.source);
			this.preview = cloneDeep(this.backup.preview);
			this.description = cloneDeep(this.backup.description);
			this.filter = cloneDeep(this.backup.filter);
		}
	}

	// 判断是否发生更改
	public isChange(key?: keyof BaseRuleRowData): boolean {
		if (key) {
			if (this.backup) {
				return !isEqual(this[key], this.backup[key]);
			} else {
				return false;
			}
		} else {
			return !isEqual(this.getRowData(), this.backup);
		}
	}

	// 新增修正方法
	public addFixItem(
		matchItem: "source" | "preview" | "description",
		type: BaseFix["type"]
	) {
		let fixItem: BaseFix;
		switch (type) {
			case "regex-extract":
				fixItem = {
					type,
					expression: "",
					flags: [],
				};
				break;
			case "regex-replace":
				fixItem = {
					type,
					expression: "",
					flags: [],
					replaceTo: "",
				};
				break;
			case "fetch-page-and-extract-content":
				fixItem = {
					type,
					selector: "",
					infoType: "property",
					name: "",
				};
				break;
		}
		this[matchItem].fix.push(fixItem);
	}
}
