import { onMounted, ref, watch } from "vue";
import { defineStore } from "pinia";
import { GM_getValue, GM_setValue } from "$";

export default defineStore("Global", () => {
	/** 窗口打开状态 */
	const openWindow = ref(false);
	/** 导航是否折叠 */
	const navCollapse = ref(true);
	/** 当前标签页 */
	const tab = ref("Gallery");
	/** 图库布局 @default "grid" */
	const galleyLayout = ref<"grid" | "waterfall">("grid");

	onMounted(()=>{
		const rawValue= GM_getValue<typeof galleyLayout.value>("galleyLayout","grid")
		galleyLayout.value = rawValue
	})
	watch(galleyLayout, (newValue, oldValue) => {
		if (newValue != oldValue) {
			GM_setValue("galleyLayout", newValue);
		}
	});

	watch(
		openWindow,
		(newValue) => {
			if (newValue) {
				// 窗口打开后隐藏页面滚动条
				// setScrollbarVisible(false);
			} else {
				// 窗口关闭后显示页面滚动条
				// setScrollbarVisible(true);
			}
		},
		{ immediate: true }
	);

	// 控制滚动条可见度
	function setScrollbarVisible(value: boolean) {
		document.documentElement.dataset.showScrollbar = value ? "true" : "false";
	}

	return { openWindow, tab, navCollapse, galleyLayout };
});
