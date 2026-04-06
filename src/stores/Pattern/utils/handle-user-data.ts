import { GM_getValue, GM_setValue } from "$";
import { Pattern } from "@/models";
import type { RawPattern } from "@/models/Pattern/interface/Pattern";

// 设置用户方案数据
export function setUserPatternList(list: Pattern[] = []) {
	const rowDataList = list
		.filter((r) => !r.id.includes("#")) // 排除掉默认内置的方案
		.map((p) => p.toRaw({ type: "backup" }));
	console.log(
		"%c[日志]%cResource Extractor Monkey:",
		"color: #800080; background: #FFFF00; font-size: 14px;font-weight: bold; padding: 0 5px;",
		"color: #00FF00; font-size: 14px; padding: 0 5px;margin:5px",
		"存储用户方案",
		rowDataList,
	);
	GM_setValue("UserPatternList", JSON.stringify(rowDataList));
}

// 获取用户方案数据
export function getUserPatternList(): Pattern[] {
	let result = GM_getValue<RawPattern[] | string>("UserPatternList", []);

	// 如果是 string 类型则通过 json 解析成对象数组
	if (typeof result === "string") {
		result = [...(JSON.parse(result) as Array<RawPattern>)];
	}

	const userPatternList = result.map((pattern: any) => {
		return new Pattern(pattern);
	});

	console.log(
		"%c[日志]%cResource Extractor Monkey:",
		"color: #800081; background: #FFFF00; font-size: 14px;font-weight: bold; padding: 0 5px;",
		"color: #00FF00; font-size: 14px; padding: 0 5px;margin:5px",
		"读取用户方案",
		userPatternList,
	);

	return userPatternList;
}
