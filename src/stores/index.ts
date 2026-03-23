import useGlobalStore from "./Global"; // 全局仓库
import useLoadingStore from "./Loading"; // 进度条仓库
import useCardStore from "./Card"; // 卡片仓库
import useFavoriteStore from "./FavoriteCard"; // 收藏仓库 (indexDB仓库)
import usePatternStore from "./Pattern"; // 规则仓库

export {
	useGlobalStore,
	useLoadingStore,
	useCardStore,
	usePatternStore,
	useFavoriteStore,
};
