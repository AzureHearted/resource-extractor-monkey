// t 元信息
export interface Meta {
	/** 有效性 */
	valid: boolean;
	/** 类型 */
	type: "image" | "video" | "audio" | "zip" | "html" | "unknown";
	/** 宽度尺寸 */
	width: number;
	/** 高度尺寸 */
	height: number;
	/** 宽高比 */
	aspectRatio: number;
	/** 大小 */
	size: number;
	/** 扩展名 */
	ext: string;
}
