// 获取Dom元素
type optionsType = {
	/** 返回模式 @default "first" */
	mode: "all" | "first" | "last";
	/** 指定从哪个DOM节点开始查找 @default document */
	regionDOM: HTMLElement | Document;
	/** 要排除的祖先选择器 */
	excludeParentSelectors?: string[];
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
		excludeParentSelectors: [],
	};

	// 合并选项
	const { mode, regionDOM, excludeParentSelectors } = {
		...defaultOptions,
		...options,
	};

	// s 选择器为空则返回空值
	if (!selector) {
		return [];
	}

	// s 拆分选择器(拆分用逗号分隔的选择器,用于调整最后结果的顺序)
	const selectors = selector.split(",");

	// s 合成排除父级选择器
	const excludeParentSelector = excludeParentSelectors?.length
		? excludeParentSelectors.join(",")
		: "";

	// s 获取dom
	const doms = selectors.reduce<HTMLElement[]>((result, currSelector) => {
		try {
			const matches = regionDOM.querySelectorAll(currSelector);
			result.push(...(Array.from(matches) as Array<HTMLElement>));
			if (excludeParentSelector) {
				return result.filter((x) => !x.closest(excludeParentSelector));
			} else {
				return result;
			}
		} catch (e) {
			console.error(e);
			return result;
		}
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
