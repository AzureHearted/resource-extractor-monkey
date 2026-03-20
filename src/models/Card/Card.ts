import { cloneDeep } from "lodash";
import type { Card as ICard } from "./interface/Card";
import type { State as IState } from "./interface/State";
import { Meta } from "./Meta";

// 不带状态的卡片类型
export class RawCard implements ICard {
	public readonly id: string;
	public source: ICard["source"];
	public preview: ICard["preview"];
	public description: ICard["description"];
	public tags: string[];

	constructor(raw: Partial<ICard>) {
		const { id, source, preview, description, tags } = raw;

		this.id = id ?? crypto.randomUUID();
		this.source = {
			...(source ?? { meta: new Meta(), dom: null, host: "" }),
			url: source?.url ?? "",
		};
		this.preview = {
			...(preview ?? { meta: new Meta(), dom: null }),
			url: preview?.url ?? "",
		};
		this.description = {
			...(description ?? { dom: null }),
			content: description?.content ?? "",
		};

		this.tags = tags ? [...new Set(tags)] : []; // 用 Set 去重
	}

	/**
	 * 内容指纹
	 * - 仅由 source.content + preview.content 决定
	 * - 顺序敏感
	 * - 稳定
	 * - 用于 IndexedDB / DB 检索
	 */
	public get fingerprint(): string {
		const s = this.source?.url ?? "";
		const p = this.preview?.url ?? "";

		// 明确边界 + 顺序敏感
		return calcFingerprint64(`S:${s}||P:${p}`);
	}
}

export class Card extends RawCard implements IState {
	public isSelected: IState["isSelected"] = false;
	public isFavorite: IState["isFavorite"] = false;
	public isLoaded: IState["isLoaded"] = false;
	public downloading: IState["downloading"] = false;

	constructor(raw: Partial<ICard & IState>) {
		super(raw);
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

	// 转为纯数据对象 (包含DOM引用)
	public toRaw(): RawCard;
	public toRaw(options: { includeId: true }): RawCard;
	public toRaw(options: {
		includeId: false;
	}): Omit<RawCard, "id"> & { id?: string };
	public toRaw(
		options: {
			/** 保留id */
			includeId: boolean;
		} = { includeId: true },
	) {
		const { includeId = true } = options;

		const raw = cloneDeep<Omit<RawCard, "id"> & { id?: string }>({
			source: {
				...this.source,
			},
			preview: {
				...this.preview,
			},
			description: {
				...this.description,
			},
			fingerprint: this.fingerprint,
			tags: [...this.tags],
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

/**
 * 计算 FNV-1a 64bit（标准实现 + 固定长度输出）
 * - 固定输出：16位 hex（64bit = 8 bytes）
 * - 性能稳定
 * - 适合做指纹 / 索引 key
 */
export function calcFingerprint64(str: string): string {
	let hash = 0xcbf29ce484222325n;
	const prime = 0x100000001b3n;
	const mod = 0xffffffffffffffffn;

	for (const ch of str) {
		hash ^= BigInt(ch.codePointAt(0)!);
		hash = (hash * prime) & mod;
	}

	// 👉 固定 16 字符（64bit = 16 hex chars）
	return hash.toString(16).padStart(16, "0");
}
