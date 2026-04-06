import { GM_getValue, GM_setValue } from "$";
import { menuConfig } from "@/views/layout/menuConfig";
import { StyleProvider, Themes } from "@varlet/ui";
import { useDark, usePreferredDark } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";

type Theme = "light" | "dark" | "auto";

export const useGlobalStore = defineStore("Global", () => {
	/** 窗口打开状态 */
	const openWindow = ref(false);
	/** 导航是否折叠 */
	const navCollapse = ref(true);
	/** 当前标签页 */
	const tab = ref<(typeof menuConfig)[number]["key"]>("Gallery");

	/** 图库状态配置 */
	const galleryState = reactive({
		/** 允许过度效果 @default true */
		allowTransition: true,
		/** 允许img组件生成缩略图 @default false */
		allowImgCreateThumb: false,
		/** 图库布局 @default "grid" */
		galleyLayout: "grid" as "grid" | "waterfall",
		/** 列数 @default 5 */
		column: 5,
		/** 页面加载后使用匹配的方案（如果没有，则使用默认方案）获取页面资源 @default false */
		pageLoadedGetResource: true,
		/** 主题 */
		theme: "auto" as Theme,
	});

	// 判断当前系统主题偏好是否是暗黑模式
	const isSystemDarkTheme = usePreferredDark();

	const isDark = useDark();

	/** 当前主题 */
	const theme = computed<Omit<Theme, "auto">>(() => {
		if (galleryState.theme === "auto") {
			return isDark.value ? "dark" : "light";
		} else {
			return galleryState.theme;
		}
	});

	watch(
		() => galleryState.theme,
		(t) => {
			updataTheme(t);
		},
	);

	function updataTheme(theme: Theme) {
		if (theme !== "auto") {
			isDark.value = theme === "dark";
			StyleProvider(theme === "dark" ? Themes.dark : null);
		} else {
			isDark.value = isSystemDarkTheme.value;
			StyleProvider(isSystemDarkTheme.value ? Themes.dark : null);
		}
	}

	// w 组件挂载时从油猴存储内读取配置
	onMounted(() => {
		init();
	});

	// f 初始化
	function init() {
		initGalleryState();
	}

	function initGalleryState() {
		const galleryStateRowInfo = GM_getValue<typeof galleryState>(
			"GalleryState",
			{
				allowImgCreateThumb: false,
				allowTransition: true,
				galleyLayout: "grid",
				column: 5,
				pageLoadedGetResource: false,
				theme: "auto",
			},
		);

		galleryState.allowImgCreateThumb = galleryStateRowInfo.allowImgCreateThumb;
		galleryState.allowTransition = galleryStateRowInfo.allowTransition;
		galleryState.galleyLayout = galleryStateRowInfo.galleyLayout;
		galleryState.column = galleryStateRowInfo.column || 5;
		galleryState.pageLoadedGetResource =
			galleryStateRowInfo.pageLoadedGetResource;
		galleryState.theme = galleryStateRowInfo.theme || "auto";
	}

	// 监听 galleryState
	watch(
		() => galleryState,
		(newValue) => {
			// 更新 galleyLayout 配置
			GM_setValue("GalleryState", { ...newValue });
		},
		{ deep: true },
	);

	return {
		openWindow,
		tab,
		navCollapse,
		galleryState,
		theme,
		updataTheme,
	};
});
