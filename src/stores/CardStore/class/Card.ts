import { cloneDeep } from "@/plugin/lodash";
import type {
  BaseCard,
  CardDescription,
  CardPreview,
  CardSource,
  BaseState,
} from "../interface";
import type { BaseCardRowData } from "../interface/base-card";

export type ICard = Partial<BaseCard> & BaseState;

// 卡片对象
export default class Card implements ICard {
  public readonly id: string;
  public source: CardSource = {
    url: "", // 卡片来源url，可能为空，因为可能从本地创建的卡片，没有url
    dom: null,
    meta: { valid: false, width: 0, height: 0, type: "html", ext: "" },
  };
  public preview: CardPreview = {
    url: "", // 预览图url,
    dom: null,
    meta: { valid: false, width: 0, height: 0, type: "html", ext: "" },
  };
  public description: CardDescription = {
    title: "", // 卡片标题，可能为空，因为可能从本地创建的卡片，没有标题
    dom: null,
  };
  public tags: string[];

  public isMatch: boolean = false;
  public isSelected: boolean = false;
  public isLoaded: boolean = false;
  public isFavorite: boolean = false;
  public loading: boolean = false;

  // 构造函数
  constructor(option?: Partial<BaseCard>) {
    const {
      id,
      source,
      preview,
      description,
      isMatch,
      isFavorite,
      loading,
      isLoaded,
      isSelected,
      tags,
    } = option || {};
    // 初始化卡片对象属性
    this.id = id || crypto.randomUUID(); // 生成uuid作为id
    this.isMatch = isMatch || this.isMatch;
    this.isSelected = isSelected || this.isSelected;
    this.isLoaded = isLoaded || this.isLoaded;
    this.isFavorite = isFavorite || this.isFavorite;
    this.loading = loading || this.loading;
    this.tags = tags || [];
    // 合并用户初始化传入的值，如果有的话。
    this.source = { ...this.source, ...source };
    this.preview = { ...this.preview, ...preview };
    this.description = {
      ...this.description,
      ...description,
    };
  }

  // 设置Preview blob
  public setPreviewBlob(blob: Blob): void {
    this.preview.blob = blob;
  }

  // 设置Source blob
  public setSourceBlob(blob: Blob): void {
    this.source.blob = blob;
  }

  // 设置卡片描述
  public setDescription(description: CardDescription): void {
    this.description = description;
  }

  // 设置卡片预览图
  public setPreview(preview: CardPreview): void {
    this.preview = preview;
  }

  // 设置卡片来源
  public setSource(source: CardSource & { originUrls?: string[] }): void {
    this.source = source;
  }

  // 获取纯数据对象
  public getRowData(options?: { includeId?: boolean }): BaseCardRowData {
    const defaultOptions: {
      includeId: boolean;
    } = {
      includeId: true,
    };
    const { includeId } = { ...defaultOptions, ...options };
    const rowData = cloneDeep({
      id: includeId ? this.id : undefined,
      source: this.source,
      preview: this.preview,
      description: this.description,
      tags: this.tags,
    });
    // 去除所有dom
    rowData.source.dom = null;
    rowData.preview.dom = null;
    rowData.description.dom = null;
    return rowData;
  }
}
