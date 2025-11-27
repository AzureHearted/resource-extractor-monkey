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
      id: "#default-rule#",
      enable: true,
      name: "默认规则",
      region: {
        enable: true,
        selector:
          'meta[property="og:image"],a:has(>img),[href*=\\.jpg],[href*=\\.png],[href*=\\.webp],[href*=\\.jpeg],img[data-src],img[src],video>source[src],video[src]',
      },
      source: {
        selector: "",
        infoType: "attribute",
        name: "content|href|srcset|data-src|src",
        fix: [],
      },
      preview: {
        enable: true,
        origin: "custom",
        selector: "&>img",
        infoType: "attribute",
        name: "srcset|data-src|src",
        fix: [],
      },
      description: {
        enable: false,
        origin: "source",
        selector: "",
        infoType: "property",
        name: "src",
        fix: [],
      },
      filter: {
        formats: [],
        width: [300, 2000],
        height: [300, 2000],
      },
    }),
  ],
});
