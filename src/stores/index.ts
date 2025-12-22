import useGlobalStore from "./GlobalStore"; // 全局仓库
import useLoadingStore from "./LoadingStore"; // 进度条仓库
import useCardStore from "./CardStore"; // 卡片仓库
import usePatternStore from "./PatternStore"; // 规则仓库
import useFavoriteStore from "./FavoriteStore"; // 收藏仓库 (indexDB仓库)

export {
	useGlobalStore,
	useLoadingStore,
	useCardStore,
	usePatternStore,
	useFavoriteStore,
};
