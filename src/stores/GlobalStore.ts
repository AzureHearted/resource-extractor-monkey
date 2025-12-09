import { markRaw, onMounted, reactive, ref, watch } from "vue";
import { defineStore } from "pinia";
import { GM_getValue, GM_setValue } from "$";

export default defineStore("Global", () => {
	/** 窗口打开状态 */
	const openWindow = ref(false);
	/** 导航是否折叠 */
	const navCollapse = ref(true);
	/** 当前标签页 */
	const tab = ref("Gallery");

	/** 图库状态配置 */
	const galleryState = reactive({
		/** 允许过度效果 @default true */
		allowTransition: true,
		/** 允许img组件生成缩略图 @default false */
		allowImgCreateThumb: false,
		/** 图库布局 @default "grid" */
		galleyLayout: "grid" as "grid" | "waterfall",
	});

	// w 组件挂载时从油猴存储内读取配置
	onMounted(() => {
		init();
	});

	// f 初始化
	function init() {
		const galleryStateRowInfo = GM_getValue<typeof galleryState>(
			"GalleryState",
			{
				allowImgCreateThumb: false,
				allowTransition: true,
				galleyLayout: "grid",
			}
		);

		galleryState.allowImgCreateThumb = galleryStateRowInfo.allowImgCreateThumb;
		galleryState.allowTransition = galleryStateRowInfo.allowTransition;
		galleryState.galleyLayout = galleryStateRowInfo.galleyLayout;
	}

	// 监听 galleryState
	watch(
		() => galleryState,
		(newValue) => {
			// 更新 galleyLayout 配置
			GM_setValue("GalleryState", markRaw(newValue));
		},
		{ deep: true }
	);

	return { openWindow, tab, navCollapse, galleryState };
});
