<template>
	<BaseFlex ref="containerDOM" class="re-favorite" direction="column">
		<!-- 工具栏 -->
		<FavoriteToolbar />
		<BaseFlex class="re-favorite__content-wrapper">
			<BaseTabs
				style="width: 100%; height: 100%"
				content-style="overflow:hidden;"
				:show-buttons="false"
				@change="nowType = $event as any"
			>
				<!-- s 图片类 -->
				<BaseTabPane name="image">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-mdi-images />
							</n-icon>
							图片
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.image.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<FavoriteBaseCardList
						:card-list="filterCardList.image"
						:search-keywords="filters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 视频类 -->
				<BaseTabPane name="video">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-animated-images-rounded />
							</n-icon>
							视频
							<n-badge
								:value="filterCardList.video.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<FavoriteBaseCardList
						:card-list="filterCardList.video"
						:search-keywords="filters.keyword"
						layout="waterfall"
					/>
				</BaseTabPane>
				<!-- s 压缩包类 -->
				<BaseTabPane name="zip">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-ant-design-file-zip-filled />
							</n-icon>
							压缩包
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.zip.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<FavoriteBaseCardList
						:card-list="filterCardList.zip"
						:search-keywords="filters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 网页类 -->
				<BaseTabPane name="html">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-dataset-linked />
							</n-icon>
							网页
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.html.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<FavoriteBaseCardList
						:card-list="filterCardList.html"
						:search-keywords="filters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
				<!-- s 其他类 -->
				<BaseTabPane name="other">
					<template #label>
						<n-flex :size="4" align="center" :wrap="false">
							<n-icon>
								<icon-material-symbols-other-admission-outline />
							</n-icon>
							其他
							<n-badge
								style="margin-left: 4px"
								:value="filterCardList.unknown.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<FavoriteBaseCardList
						:card-list="filterCardList.unknown"
						:search-keywords="filters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
			</BaseTabs>
		</BaseFlex>
	</BaseFlex>
</template>

<script setup lang="ts">
import FavoriteToolbar from "./favorite-toolbar.vue";
import FavoriteBaseCardList from "./favorite-base-card-list.vue";
import { BaseFlex, BaseTabs, BaseTabPane } from "base-ui";

import { storeToRefs } from "pinia";
import { useGlobalStore, useFavoriteStore } from "@/stores";

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

const favoriteStore = useFavoriteStore();
const { filterCardList, nowType, filters } = storeToRefs(favoriteStore);
</script>

<style lang="scss" scoped>
.re-favorite {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.re-favorite__content-wrapper {
	flex: 1; // 必须设置用来撑满容器
	padding: 4px;
	overflow: hidden; // 必须要设置溢出隐藏
}

:deep(.base-tabs__tab-item) {
	font-size: 14px;
	padding: 0 10px;
}
</style>
