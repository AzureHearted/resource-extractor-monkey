<template>
	<BaseFlex
		ref="containerDOM"
		class="re-gallery"
		:class="{
			're-gallery--dark': globalStore.theme === 'dark',
		}"
		direction="column"
	>
		<!-- 顶部工具栏 -->
		<GalleryToolbar />
		<BaseFlex class="re-gallery__content-wrapper">
			<template v-if="filterCardList.all.length > 0">
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
							<GalleryBaseCardList
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
							<GalleryBaseCardList
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
						<GalleryBaseCardList
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
						<GalleryBaseCardList
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
						<GalleryBaseCardList
							:card-list="filterCardList.unknown"
							:search-keywords="filters.keyword"
							:layout="galleryState.galleyLayout"
						/>
					</BaseTabPane>
				</BaseTabs>
			</template>
			<template v-else>
				<BaseFlex
					class="re-gallery__content-empty"
					align="center"
					justify="center"
				>
					<BaseFlex direction="column" style="margin: 16px">
						<div style="flex: 1">请选择一个匹配方案：</div>
						<BaseFlex align="center" :gap="4">
							<n-select
								style="min-width: 200px"
								class="pattern-selector"
								v-model:value="patternStore.current.id"
								placeholder="请选择一个方案"
								:to="false"
								:render-label="renderPatternSelectOptionsLabel"
								:options="patternSelectOptions"
								filterable
							/>
							<n-button @click.stop="getCards" v-if="!loadingStore.loading">
								加载
							</n-button>
							<n-button @click.stop="stopGetCards" v-else> 停止 </n-button>
						</BaseFlex>
					</BaseFlex>
				</BaseFlex>
			</template>
		</BaseFlex>
	</BaseFlex>
</template>

<script setup lang="ts">
import { Pattern } from "@/models";
import {
	useCardStore,
	useGlobalStore,
	useLoadingStore,
	usePatternStore,
} from "@/stores";
import { BaseFlex, BaseImg, BaseTabPane, BaseTabs } from "base-ui";
import { useNotification, type SelectOption } from "naive-ui";
import { storeToRefs } from "pinia";
import { computed, h, ref, type VNodeChild } from "vue";
import GalleryBaseCardList from "./gallery-base-card-list.vue";
import GalleryToolbar from "./gallery-toolbar.vue";

const notification = useNotification();

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

const cardStore = useCardStore();
const { filterCardList, nowType, filters } = storeToRefs(cardStore);

const patternStore = usePatternStore();

const loadingStore = useLoadingStore();

const patternSelectOptions = computed<SelectOption[]>(() => {
	return patternStore.list.map((p) => {
		return {
			key: p.id,
			label: p.mainInfo.name,
			value: p.id,
			rowData: p,
		} as SelectOption;
	});
});

// 方案选项标签渲染函数
const renderPatternSelectOptionsLabel = (option: SelectOption): VNodeChild => {
	return h(
		"div",
		{
			style: "display:flex; align-items: center;",
		},
		[
			option && !(option.key as string).includes("#")
				? h(BaseImg, {
						src: (option.rowData as Pattern).mainInfo.icon,
						style:
							"width: 16px; height: 16px;margin-right:4px; flex-shrink: 0;",
					})
				: null,
			h(
				"div",
				{
					style: {
						userSelect: "none",
						// s 这里如果判断选项对应的方案与当前站点匹配则字体显示为红色
						color:
							!(option.rowData as Pattern).id.includes("#") &&
							(option.rowData as Pattern).mainInfo.matchHost.some((host) => {
								return new RegExp(`${host}`).test(location.origin);
							})
								? "red"
								: null,
						overflow: "hidden",
						"text-overflow": "ellipsis",
					},
					title: option.label,
				},
				{ default: () => option.label as string },
			),
		],
	);
};

// 停止标识符
let stopGetCardsFlag = ref(false);

// f 获取卡片
async function getCards() {
	const pattern = patternStore.getCurrentPattern();
	if (pattern == null) return;
	stopGetCardsFlag.value = false;
	await cardStore.getPageCard(pattern, {
		stopFlag: stopGetCardsFlag,
		notification,
	});
}

// f 终止卡片获取进度
function stopGetCards() {
	// console.log("终止操作")
	stopGetCardsFlag.value = true;
}
</script>

<style lang="scss" scoped>
.re-gallery {
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	overflow: hidden;

	&__content-wrapper {
		flex: 1; // 必须设置用来撑满容器
		padding: 4px;
		overflow: hidden; // 必须要设置溢出隐藏
	}

	&__content-empty {
		flex: 1; // 必须设置用来撑满容器
		text-wrap: nowrap;

		background: rgba(getTheme(light, background), 0.35);
	}

	// 暗色主题
	&--dark &__content-empty {
		background: rgba(getTheme(dark, background), 0.5);
	}
}

:deep(.base-tabs__tab-item) {
	font-size: 14px;
	padding: 0 10px;
}
</style>
