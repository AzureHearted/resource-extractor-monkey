// t 基础信息接口
export interface State {
	/** 选中状态 */
	isSelected: boolean;
	/** 资源是否已加载 */
	isLoaded: boolean;
	/** 资源是否已收藏 */
	isFavorite: boolean;
	/** 是否正在下载中 */
	downloading: boolean;
}
