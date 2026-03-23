import type { ToolbarOptions } from "@fancyapps/ui";

export default {
	enabled: true,
	// 要显示的工具
	display: {
		left: ["open", "download"],
		middle: ["counter"],
		right: ["rotateCCW", "rotateCW", "toLocate", "thumbs", "close"],
	},
} as Partial<ToolbarOptions>;
