import type { Meta as IMeta } from "./interface/Meta";

export class Meta implements IMeta {
	public valid: boolean;
	public type: "html" | "image" | "video" | "audio" | "zip" | "unknown";
	public width: number;
	public height: number;
	public size: number;
	public ext: string;
	public get aspectRatio() {
		if (this.width === 0 || this.height === 0) {
			return 1;
		} else {
			return this.width / this.height;
		}
	}

	constructor();
	constructor(meta: Partial<IMeta>);
	constructor(meta?: Partial<IMeta>) {
		this.valid = meta?.valid ?? false;
		this.type = meta?.type ?? "unknown";
		this.width = meta?.width ?? 0;
		this.height = meta?.height ?? 0;
		this.size = meta?.size ?? 0;
		this.ext = meta?.ext ?? "";
	}
}
