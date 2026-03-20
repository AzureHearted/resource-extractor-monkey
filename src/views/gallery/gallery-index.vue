<template>
	<div ref="containerDOM" class="gallery__container">
		<!-- 顶部工具栏 -->
		<GalleryToolbar />
		<!-- 瀑布流 -->
		<n-flex class="gallery__content-wrap">
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
								:value="filterCardList.image.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<keep-alive>
						<GalleryBaseWaterfall
							:card-list="filterCardList.image"
							:search-keywords="filters.keyword"
							:layout="galleryState.galleyLayout"
						/>
					</keep-alive>
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
					<keep-alive>
						<GalleryBaseWaterfall
							:card-list="filterCardList.video"
							:search-keywords="filters.keyword"
							layout="waterfall"
						/>
					</keep-alive>
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
								:value="filterCardList.zip.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
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
								:value="filterCardList.html.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
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
								:value="filterCardList.unknown.length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
						:card-list="filterCardList.unknown"
						:search-keywords="filters.keyword"
						:layout="galleryState.galleyLayout"
					/>
				</BaseTabPane>
			</BaseTabs>
		</n-flex>
	</div>
</template>

<script setup lang="ts">
import GalleryToolbar from "./gallery-toolbar.vue";
import GalleryBaseWaterfall from "./gallery-base-card-list.vue";
import BaseTabs from "@/components/base/base-tabs/base-tabs.vue";
import BaseTabPane from "@/components/base/base-tabs/base-tab-pane.vue";

import { storeToRefs } from "pinia";

import useGlobalStore from "@/stores/GlobalStore";
const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

import useCardStore from "@/stores/CardStore";
const cardStore = useCardStore();
const { filterCardList, nowType, filters } = storeToRefs(cardStore);
</script>

<style lang="scss" scoped>
// 画廊容器样式
.gallery__container {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	display: flex;
	flex-flow: column;
	overflow: hidden;
}

// 瀑布流容器样式
.gallery__content-wrap {
	padding: 4px;
	flex: 1; // 必须设置用来撑满容器
	overflow: hidden; // 必须要设置溢出隐藏
}

:deep(.base-tabs__tab-item) {
	font-size: 14px;
	padding: 0 10px;
}
</style>
