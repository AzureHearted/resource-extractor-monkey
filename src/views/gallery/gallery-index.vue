<template>
	<div ref="containerDOM" class="gallery__container">
		<!-- 顶部工具栏 -->
		<GalleryToolbar />
		<!-- 瀑布流 -->
		<n-flex class="gallery__content-wrap">
			<BaseTabs
				style="width: 100%; height: 100%"
				content-style="overflow:hidden;"
				@tab-active="nowType = $event as any"
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
								:value="filterCardList.image.filter((x) => x.isMatch).length"
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
							:layout="galleyLayout"
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
								:value="filterCardList.video.filter((x) => x.isMatch).length"
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
							:layout="galleyLayout"
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
								:value="filterCardList.zip.filter((x) => x.isMatch).length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
						:card-list="filterCardList.zip"
						:search-keywords="filters.keyword"
						:layout="galleyLayout"
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
								:value="filterCardList.html.filter((x) => x.isMatch).length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
						:card-list="filterCardList.html"
						:search-keywords="filters.keyword"
						:layout="galleyLayout"
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
								:value="filterCardList.other.filter((x) => x.isMatch).length"
								:max="999"
								type="default"
							>
							</n-badge>
						</n-flex>
					</template>
					<GalleryBaseWaterfall
						:card-list="filterCardList.other"
						:search-keywords="filters.keyword"
						:layout="galleyLayout"
					/>
				</BaseTabPane>
			</BaseTabs>
		</n-flex>
	</div>
</template>

<script setup lang="ts">
import {
	ref,
	watch,
	onMounted,
	onUpdated,
	onUnmounted,
	onActivated,
	onDeactivated,
	useTemplateRef,
} from "vue";
import GalleryToolbar from "./gallery-toolbar.vue";
import GalleryBaseWaterfall from "./gallery-base-card-list.vue";
import BaseTabs from "@/components/base/base-tabs.vue";
import BaseTabPane from "@/components/base/base-tab-pane.vue";

import { storeToRefs } from "pinia";

import useGlobalStore from "@/stores/GlobalStore";
const globalStore = useGlobalStore();
const { galleyLayout } = storeToRefs(globalStore);

import useCardStore from "@/stores/CardStore";
const cardStore = useCardStore();
const { filterCardList, nowType, filters } = storeToRefs(cardStore);

const containerDOM = useTemplateRef("containerDOM");
// * 导入Fancybox和相关配置
import { Fancybox, configFancybox } from "@/plugin/fancyapps-ui";
onMounted(() =>
	FancyboxBind(
		containerDOM.value!,
		"[data-fancybox=web-img-collector]",
		containerDOM.value!
	)
);
onActivated(() =>
	FancyboxBind(
		containerDOM.value!,
		"[data-fancybox=web-img-collector]",
		containerDOM.value!
	)
);
onUnmounted(() => Fancybox.destroy());
onDeactivated(() => Fancybox.destroy());

onUpdated(() => {
	Fancybox.unbind(containerDOM.value, "[data-fancybox=web-img-collector]");
	Fancybox.close();
	FancyboxBind(
		containerDOM.value!,
		"[data-fancybox=web-img-collector]",
		containerDOM.value!
	);
});

// f 执行FancyBox绑定
function FancyboxBind(
	listContainerDOM?: HTMLElement,
	itemSelector: string = "[data-fancybox=web-img-collector]",
	teleportToDOMs?: HTMLElement
) {
	Fancybox.bind(listContainerDOM!, itemSelector, {
		...configFancybox,
		parentEl: teleportToDOMs ? teleportToDOMs : listContainerDOM,
		hideScrollbar: false,
	});
}
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

:deep(.wic2-n-tabs-tab) {
	padding-left: 12px;
	padding-right: 0px;
}

:deep(.base-tabs__tab-item) {
	font-size: 14px;
	padding: 0 10px;
	height: 28px;
	line-height: 28px;
}
</style>
