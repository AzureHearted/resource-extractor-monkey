import type { Meta } from "./Meta";

// t 卡片接口
export interface Card {
	/** 资源的唯一ID */
	id?: string;
	/** 资源的描述 */
	description: Description;
	/** 资源的预览源 */
	preview: Preview;
	/** 资源的源 */
	source: Source;
	/** 标签 */
	tags: string[];
}

// t 源
interface Source {
	/** 内容 */
	url: string;
	/** 元信息 */
	meta: Meta;
	/** 对应的DOM元素 */
	dom: HTMLElement | null;
	/** 二进制数据 */
	blob?: Blob;
	/** 原始链接 */
	originUrls?: string[];
	/** 链接所在域 */
	host: string;
}

// t 预览源
interface Preview {
	/** 内容 */
	url: string;
	/** 元信息 */
	meta: Meta;
	/** 对应的DOM元素 */
	dom: HTMLElement | null;
	/** 二进制数据 */
	blob?: Blob;
}

// t 描述
interface Description {
	/** 内容 */
	content: string;
	/** 对应的DOM元素 */
	dom: HTMLElement | null;
}
