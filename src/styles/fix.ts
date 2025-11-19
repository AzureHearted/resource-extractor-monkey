// f 降低原先页面中zIndex的值为最大值的元素的zIndex(放置这些元素z-index高于脚本容器)
export function lowerHighZIndex() {
	// 获取所有具有 z-index 属性的元素
	const elementsWithZIndex: HTMLElement[] = Array.from(
		document.querySelectorAll('[style*="z-index"]')
	);

	// 筛选出 z-index 值为 2147483647 的元素
	const elementsWithMaxZIndex = elementsWithZIndex.filter((element) => {
		const zIndex = window.getComputedStyle(element).zIndex;
		return zIndex === "2147483647";
	});

	// 输出结果
	// console.log(
	// 	elementsWithMaxZIndex,
	// 	elementsWithMaxZIndex.map((x) => x.style.zIndex)
	// );
	// 降低其z-Index
	elementsWithMaxZIndex.forEach((x) => (x.style.zIndex = "2147483645"));
}
