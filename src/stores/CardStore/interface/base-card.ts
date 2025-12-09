// t 卡片接口
export interface BaseCard extends BaseState {
	id?: string;
	name?: string;
	description: CardDescription;
	preview: CardPreview;
	source: CardSource;
	tags: string[]; // s 标签列表(用于分类)
	[key: string]: any;
}

// t 卡片初始信息
export interface BaseCardRowData extends Partial<BaseState> {
	id?: string;
	name?: string;
	description: CardDescription;
	preview: CardPreview;
	source: CardSource;
	tags: string[]; // s 标签列表(用于分类)
	[key: string]: any;
}

// t 基础信息接口
export interface BaseState {
	isSelected: boolean; //? 选中标识符
	isLoaded: boolean; //? 加载完成标识符
	isFavorite: boolean; //? 收藏标识符
	downloading: boolean; //? 下载中的标识符
}

// t 元信息接口
export interface BaseMeta {
	valid: boolean; //有效性
	width: number;
	height: number;
	aspectRatio?: number;
	type: "image" | "video" | "audio" | "zip" | "html" | "other" | false;
	size?: number;
	ext: string | false; // 后缀如果有
	[key: string]: any; // 允许添加其他属性
}

// t 基础链接类接口
export interface BaseLink {
	url: string; // 链接地址
	host?: string; // 链接请求所在域
}

// t 来源接口
export interface CardSource extends BaseLink {
	originUrls?: string[];
	dom: HTMLElement | null;
	meta: BaseMeta;
	blob?: Blob;
	[key: string]: any;
}
// t 预览接口
export interface CardPreview extends BaseLink {
	dom: HTMLElement | null;
	meta: BaseMeta;
	blob?: Blob;
	[key: string]: any;
}
// t 描述类型
export interface CardDescription extends Partial<BaseLink> {
	title: string; // 标题
	content?: string; // 内容
	dom: HTMLElement | null;
	[key: string]: any;
}
