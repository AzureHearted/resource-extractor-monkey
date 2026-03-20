import type { Card } from "./Card";

export interface FavoriteCard extends Card {
	// 添加的时间戳
	timestamp: number;
}
