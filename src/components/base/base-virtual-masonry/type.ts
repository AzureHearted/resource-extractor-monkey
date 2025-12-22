// t 数据定义
export interface Item {
	id: string;
	aspectRatio: number;
	[key: string]: any;
}

// t 位置类型
export interface Pos {
	id: string;
	realIndex: number;
	left: number;
	top: number;
	width: number;
	height: number;
}
