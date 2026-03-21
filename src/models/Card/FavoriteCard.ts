import { cloneDeep } from "@/plugin/lodash";
import { RawCard } from "./Card";
import type { State as IState } from "./interface/State";
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
export class FavoriteCard extends FavoriteRawCard implements IState {
	public isSelected: IState["isSelected"] = false;
	public isFavorite: IState["isFavorite"] = false;
	public isLoaded: IState["isLoaded"] = false;
	public downloading: IState["downloading"] = false;

	constructor(raw: Partial<IFavoriteCard & IState>) {
		super(raw);
		this.timestamp = raw.timestamp ?? Date.now();
		this.isFavorite = true;
		this.initState(raw);
	}

	// 初始化状态
	public initState(raw?: Partial<IState>) {
		const { isSelected, isFavorite, isLoaded, downloading } = raw ?? {};
		this.isSelected = isSelected ?? this.isSelected;
		this.isFavorite = isFavorite ?? this.isFavorite;
		this.isLoaded = isLoaded ?? this.isLoaded;
		this.downloading = downloading ?? this.downloading;
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
