import { cloneDeep } from "@/plugin/lodash";
import { RawCard } from "./Card";
import type { FavoriteCard as IFavoriteCard } from "./interface/FavoriteCard";

// 不带状态的收藏资源类型
export class FavoriteRawCard extends RawCard implements IFavoriteCard {
	public timestamp: number;
	constructor(resource: Partial<FavoriteRawCard>) {
		super(resource);
		// 添加的时间戳
		this.timestamp = Date.now();
	}
}

// 收藏资源类型
export class FavoriteCard extends FavoriteRawCard {
	constructor(raw: Partial<IFavoriteCard>) {
		super(raw);
		this.timestamp = raw.timestamp ?? Date.now();
	}

	// 转为纯数据对象
	public toRaw(): FavoriteRawCard;
	public toRaw(options: { includeId: true }): FavoriteRawCard;
	public toRaw(options: {
		includeId: false;
	}): Omit<FavoriteRawCard, "id"> & { id?: string };
	public toRaw(
		options: {
			/** 保留id */
			includeId: boolean;
		} = { includeId: true },
	) {
		const { includeId = true } = options;
		const raw = cloneDeep<Omit<FavoriteRawCard, "id"> & { id?: string }>({
			source: {
				...this.source,
			},
			preview: {
				...this.preview,
			},
			description: {
				...this.description,
			},
			tags: [...this.tags],
			fingerprint: this.fingerprint,
			timestamp: this.timestamp,
		});
		if (includeId) raw.id = this.id;

		return raw;
	}

	// 转为 JSON 对象 (JSON.stringify能自动识别该方法)
	public toJSON() {
		const raw = this.toRaw({ includeId: false });
		// 手动清除不可序列化属性值
		raw.preview.dom = null;
		raw.source.dom = null;
		raw.description.dom = null;
		return raw;
	}
}
