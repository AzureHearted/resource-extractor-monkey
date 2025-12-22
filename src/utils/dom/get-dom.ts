// 获取Dom元素
type optionsType = {
	mode: "all" | "first" | "last";
	regionDOM: HTMLElement | Document;
};

// 函数重载
export default function getDOM(
	selector: keyof HTMLElementTagNameMap,
	options?: Partial<optionsType>
): HTMLElement[];
export default function getDOM(
	selector: string,
	options?: Partial<optionsType>
): HTMLElement[];
export default function getDOM(
	selector: keyof HTMLElementTagNameMap | string,
	options?: Partial<optionsType>
) {
	// 默认选项
	const defaultOptions: optionsType = {
		mode: "first",
		regionDOM: document,
	};

	// 合并选项
	const { mode, regionDOM } = { ...defaultOptions, ...options };

	// s 选择器为空则返回空值
	if (!selector) {
		return [];
	}

	// s 拆分选择器(拆分用逗号分隔的选择器,用于调整最后结果的顺序)
	const selectors = selector.split(",");

	// s 获取dom
	const doms = selectors.reduce<HTMLElement[]>((result, currSelector) => {
		const matches = regionDOM.querySelectorAll(currSelector);
		result.push(...(Array.from(matches) as Array<HTMLElement>));
		return result;
	}, []);

	// console.log("selector", selector, "doms", doms);

	// 判断返回结果
	switch (mode) {
		case "all":
			// 返回所有匹配的元素数组
			return doms.length > 0 ? Array.from(doms) : [];
		case "first":
			// 返回第一个匹配的元素
			return doms.length ? [doms[0]] : [];
		case "last":
			// 返回最后一个匹配的元素
			return doms.length ? [doms[doms.length - 1]] : [];
	}
}
