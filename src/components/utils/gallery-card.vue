<template>
	<BaseCard
		class="gallery-card"
		:data-id="data.id"
		background-color="transparent"
		style="border: unset"
		:data-show="isMobile"
		:data-source-type="data.source.meta.type"
		:data-preview-type="data.preview.meta.type"
		:data-checked="data.isSelected"
		layout="absolute"
	>
		<!-- s 卡片顶部 -->
		<template #header>
			<div class="gallery-card-header">
				<!-- s header左侧 -->
				<div class="gallery-card-header-left">
					<!-- s 复选框 -->
					<div class="card-checkbox">
						<!-- s 选中复选框 -->
						<BaseCheckbox
							v-if="showCheckBox"
							:checked="data.isSelected"
							@change="emits('change:selected', $event)"
						/>
						<!-- s 收藏复选框 -->
						<BaseCheckbox
							v-if="showFavoriteButton && data.isLoaded"
							:checked="data.isFavorite"
							checked-color="red"
							@change="emits('toggle-favorite', $event)"
						>
							<template #checked>
								<icon-mdi-favorite />
							</template>
							<template #un-checked>
								<icon-mdi-favorite-border />
							</template>
						</BaseCheckbox>
					</div>
				</div>
				<!-- s header右侧 -->
				<div v-if="data.isLoaded" class="gallery-card-header-right">
					<!-- s 卡片按钮组 -->
					<div class="card-button-group">
						<!-- s 自定义按钮组 -->
						<el-button-group size="small">
							<slot name="custom-button" :openUrl="openUrl"></slot>
						</el-button-group>
						<el-button-group size="small">
							<!-- s 删除 -->
							<el-button
								v-if="showDeleteButton"
								type="danger"
								@click="emits('delete', data.id)"
							>
								<template #icon>
									<icon-material-symbols-delete />
								</template>
							</el-button>
						</el-button-group>
						<el-button-group size="small">
							<!-- s 重命名 -->
							<el-button type="primary" @click="rename(data)" title="重命名">
								<template #icon>
									<icon-ep-edit />
								</template>
							</el-button>
						</el-button-group>
						<el-button-group size="small">
							<!-- s 在页面中定位 -->
							<el-button
								type="primary"
								@click="toLocate(data)"
								v-if="data.source.dom"
								title="在页面中定位"
							>
								<template #icon>
									<icon-material-symbols-location-on-outline />
								</template>
							</el-button>
							<!-- s 下载(图片或视频类) -->
							<el-button
								v-if="
									(data.source.meta.type === 'image' ||
										data.preview.meta.type === 'image' ||
										data.source.meta.type === 'zip' ||
										data.preview.meta.type === 'zip' ||
										data.source.meta.type === 'video' ||
										data.preview.meta.type === 'video') &&
									showDownloadButton
								"
								:loading="data.downloading"
								type="success"
								title="下载"
								@click="emits('download', data.id)"
							>
								<template #icon>
									<icon-material-symbols-download />
								</template>
							</el-button>
							<!-- s 打开(网址类) -->
							<el-button
								v-if="data.source.meta.type === 'html'"
								type="default"
								@click="openUrl(data.source.url)"
								title="打开地址"
							>
								<template #icon>
									<icon-material-symbols-open-in-new-rounded />
								</template>
							</el-button>
						</el-button-group>
					</div>
				</div>
			</div>
		</template>
		<!-- s 卡片主体(图片) -->
		<template #default>
			<div ref="imgWrapRef" style="height: 100%" :data-id="data.id">
				<template v-if="data.preview.meta.type === 'image'">
					<!-- s 纯图片类型 -->
					<BaseImg
						v-if="data.source.meta.type === 'image'"
						:src="data.preview.url"
						:show-loading-animation="!data.isLoaded"
						:init-show="data.isLoaded"
						:viewport="viewport"
						decoding="async"
						:use-thumb="galleryState.allowImgCreateThumb"
						:thumb-max-size="1080"
						:observer-once="observerOnce"
						@mounted="emits('mounted')"
						@loaded="emits('loaded', data.id, $event)"
						@error="emits('error', data.id)"
						:draggable="false"
					/>
					<!-- s 网页类型(封面图片) -->
					<BaseImg
						v-else
						:src="data.preview.url"
						:show-loading-animation="!data.isLoaded"
						:init-show="data.isLoaded"
						:viewport="viewport"
						decoding="async"
						:use-thumb="galleryState.allowImgCreateThumb"
						:thumb-max-size="1080"
						:observer-once="observerOnce"
						@mounted="emits('mounted')"
						@loaded="emits('loaded', data.id, $event)"
						@error="emits('error', data.id)"
						:draggable="false"
					/>
				</template>
				<template v-else-if="data.preview.meta.type === 'video'">
					<!-- s 纯视频类型 或 网页类型(封面视频or图片)-->
					<BaseVideo
						v-if="
							data.source.meta.type === 'video' ||
							data.source.meta.type === 'image' ||
							data.source.meta.type === 'html'
						"
						muted
						hover-play
						hover-anew-start
						loop
						:show-controls="false"
						:src="data.preview.url"
						:viewport="viewport"
						:observer-once="observerOnce"
						:init-width="data.preview.meta.width"
						:init-height="data.preview.meta.height"
						@loaded="emits('loaded', data.id, $event)"
						@error="emits('error', data.id)"
					/>
				</template>
				<!-- s html的其他类型 -->
				<template v-else>
					<BaseImg
						src=""
						:init-show="true"
						@mounted="emits('mounted')"
						@loaded="emits('loaded', data.id, $event)"
						@error="emits('error', data.id)"
						:draggable="false"
					>
						<!-- 一个Html的svg图标 -->
						<HtmlTypeImg
							style="width: 100%; height: auto; transform: scale(0.5)"
						/>
					</BaseImg>
				</template>
			</div>
		</template>
		<!-- s 卡片底部 -->
		<template #footer>
			<div class="gallery-card-footer" align="center" :size="2">
				<!-- s 额外标签 -->
				<div v-if="false" class="extra-tag-list">
					<BaseLineOverFlowList
						:list="tags"
						model-to=".resource-extractor__modal-container"
					>
						<template #default="{ item, openShowMore }">
							<var-chip
								:key="item.id"
								size="mini"
								@click="openShowMore"
								:title="(item as Tag).label"
							>
								{{ (item as Tag).label }}
							</var-chip>
						</template>
						<template #modal-title>
							<span
								:title="data.description.content"
								style="
									font-size: 12px;
									overflow: inherit;
									white-space: inherit;
									text-overflow: inherit;
								"
							>
								{{ data.description.content }}
							</span>
						</template>
						<template #modal-content>
							<n-dynamic-tags
								:value="data.tags"
								type="info"
								@update:value="handleTagsSave"
							/>
						</template>
						<template #modal-footer>
							<div>
								<n-popconfirm
									positive-text="确认"
									negative-text="取消"
									:to="false"
									@positive-click="data.tags.splice(0)"
								>
									<template #trigger>
										<n-button type="warning" size="tiny" @click.stop>
											清空
										</n-button>
									</template>
									<div>
										<div style="color: red">确认清空？</div>
										<div>此操作将无法撤回</div>
									</div>
								</n-popconfirm>
							</div>
						</template>
					</BaseLineOverFlowList>
				</div>
				<!-- s 基本信息标签 -->
				<div class="base-tag-list">
					<!-- s 描述标签 -->
					<el-tag
						class="base-tag-list__title-tag"
						type="info"
						size="small"
						:title="data.description.content.trim()"
					>
						<!-- <span v-html="description"></span> -->
						<BaseHighlightText
							:text="data.description.content"
							:keyword="highlightKey"
						></BaseHighlightText>
					</el-tag>
					<!-- s 尺寸信息 -->
					<el-tag
						class="base-tag-list__scale-tag"
						v-if="data.source.meta.type === 'image' && data.isLoaded"
						size="small"
						:title="`${validMeta.width}x${validMeta.height}`"
					>
						{{ validMeta.width }}x{{ validMeta.height }}
					</el-tag>
					<!-- s 扩展名信息 -->
					<el-tag
						class="base-tag-list__ext-tag"
						v-if="
							!!data.source.meta.ext &&
							data.isLoaded &&
							data.source.meta.type != 'html'
						"
						size="small"
						:title="data.source.meta.ext"
					>
						{{ data.source.meta.ext }}
					</el-tag>
					<!-- s 网页标签 -->
					<el-tag
						class="base-tag-list__html-tag"
						v-if="data.source.meta.type === 'html'"
						type="warning"
						size="small"
						title="网页"
					>
						网页
					</el-tag>
					<!-- s 文件大小信息 -->
					<el-tag
						class="base-tag-list__size-tag"
						v-if="
							!!data.source.blob && !!data.source.blob.size && data.isLoaded
						"
						type="success"
						size="small"
						:title="size"
					>
						{{ size }}
					</el-tag>
				</div>
			</div>
		</template>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ComputedRef } from "vue";
import BaseCard from "@/components/base/base-card.vue";
import BaseImg from "@/components/base/base-img.vue";
import BaseVideo from "@/components/base/base-video.vue";
import BaseCheckbox from "@/components/base/base-checkbox.vue";
import BaseLineOverFlowList from "@/components/base/base-line-overflow-list.vue";
import { Card } from "@/models/Card/Card";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";
import { GM_openInTab } from "$";
import { ElMessageBox } from "@/plugin/element-plus";
// 导入公用TS库
import { byteAutoUnit, legalizationPathString } from "@/utils/common";
// 导入svg
import HtmlTypeImg from "@svg/html.svg";
// 导入仓库
import { useGlobalStore } from "@/stores";
import { storeToRefs } from "pinia";
import BaseHighlightText from "../base/base-highlight-text.vue";

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

// s 卡片数据
const data = defineModel<Card>("data", { required: true });

withDefaults(
	defineProps<{
		viewport?: IntersectionObserverInit["root"];
		/** 图片视口检测是否只检测一次  @default true */
		observerOnce?: boolean;
		/** 显示CheckBox  @default true */
		showCheckBox?: boolean;
		/** 显示删除按钮  @default true */
		showDeleteButton?: boolean;
		/** 显示下载按钮  @default true */
		showDownloadButton?: boolean;
		/** 显示收藏按钮  @default true */
		showFavoriteButton?: boolean;
		/** 显示定位按钮  @default true */
		showToLocateButton?: boolean;
		/** 移动端标识 (判断是否是移动端) @default false */
		isMobile?: boolean;
		/** 要高亮的关键词 */
		highlightKey?: string;
		/** 下载标识符 */
		downloading?: boolean;
	}>(),
	{
		observerOnce: true,
		showCheckBox: true,
		showDeleteButton: true,
		showDownloadButton: true,
		showFavoriteButton: true,
		showToLocateButton: true,
		downloading: false,
	},
);

// ? 定义emits
const emits = defineEmits<{
	(e: "change:selected", val: boolean): Promise<void>; // 选中状态变化事件
	(e: "change:title", id: string, val: string): Promise<void>; // 标题变化事件
	(e: "toggle-favorite", val: boolean): Promise<void>; // 卡片收藏事件
	(e: "loaded", id: string, info: ImgReadyInfo): Promise<void>; // 卡片加载成功事件
	(e: "error", id: string): Promise<void>; // 卡片加载失败事件
	(e: "download", id: string): Promise<void>; // 下载事件
	(e: "delete", id: string): Promise<void>; // 删除事件
	(e: "save:tags", id: string, newTags: string[]): Promise<void>; // 卡片tags保存事件
	(e: "mounted"): void;
}>();

// j 大小
const size: ComputedRef<string> = computed(() => {
	const byteSize = data.value.source.blob?.size;
	if (byteSize) {
		return byteAutoUnit(byteSize);
	} else {
		return `0B`;
	}
});

// j 有效meta
const validMeta = computed(() => {
	if (data.value.source.meta.valid) {
		return data.value.source.meta;
	} else {
		return data.value.preview.meta;
	}
});

interface Tag {
	id: string;
	label: string;
}
// j 标签
const tags = computed<Tag[]>(() => {
	return data.value.tags.map((tag) => {
		return {
			id: crypto.randomUUID(),
			label: tag,
		};
	});
});

// f 页面定位元素
function toLocate(item: Card) {
	const dom = item.source.dom;
	if (!dom) return;
	// console.log("定位元素", item);
	dom.scrollIntoView({
		behavior: "smooth",
		inline: "center",
		block: "center",
	}); // 滚动到指定元素位置，平滑滚动，并居中显示。
	globalStore.openWindow = false;
}
// f 重命名
function rename(item: Card) {
	// 删除卡片数据模型中的卡片。
	ElMessageBox.prompt(`重命名卡片"${item.description.content}"为……`, "重命名", {
		appendTo: ".resource-extractor__notification",
		confirmButtonText: "确认",
		cancelButtonText: "取消",
		inputPlaceholder: "请输入新卡片名称",
		inputValue: legalizationPathString(item.description.content),
		draggable: true,
	})
		.then(({ value: newName }) => {
			// 确认
			item.description.content = legalizationPathString(newName);
			// 触发标题变化事件
			emits("change:title", item.id!, item.description.content);
		})
		.catch(() => {
			// 取消
		});
}

// f 打开网址
async function openUrl(url: string) {
	GM_openInTab(url, { active: true, insert: true, setParent: true });
}

// f 处理卡片标签变化
const handleTagsSave = (newTags: string[]) => {
	newTags = [...new Set(newTags)]; // s 去重
	data.value.tags.splice(0);
	data.value.tags.push(...newTags);
	console.log("newTags", data.value.tags, newTags);
	emits("save:tags", data.value.id, newTags);
};
</script>

<style lang="scss" scoped>
// 卡片顶部
.gallery-card-header {
	position: relative;
	display: flex;
	padding: 2px;

	pointer-events: none;
	* {
		pointer-events: auto;
	}
}

:deep(.re-button) {
	padding: 2px 4px;
	border: unset;
	box-shadow: var(--el-box-shadow);
	.re-icon {
		font-size: 16px;
	}
}

// header左侧
.gallery-card-header-left {
	flex: 0;
}

// header右侧
.gallery-card-header-right {
	margin-left: auto;
	display: flex;
	flex-flow: row-reverse;
	align-items: center;
}

// 卡片按钮组样式
.card-button-group {
	height: fit-content;
	display: flex;
	gap: 4px;
	pointer-events: none;
	transform: rotateX(-90deg);

	opacity: 0;
	visibility: hidden;
	transform: scale(0.8); /* 可加轻微缩放效果 */
	transition:
		transform 0.5s ease,
		opacity 0.5s ease,
		visibility 0s ease 0.5s;
}

// 卡片悬浮时才显示按钮组
.gallery-card:hover .gallery-card-header-right .card-button-group {
	opacity: 1;
	visibility: visible;
	transform: scale(1); /* hover 放大到原始大小 */
	transition:
		transform 0.3s ease,
		opacity 0.3s ease,
		visibility 0s ease;
}

.card-checkbox {
	position: absolute;
	display: flex;
	// top: -2px;
	// left: -2px;
	transform: translate(-2px, -2px);
	filter: drop-shadow(0 0 1px #ffffff);
}

// 卡片底部
/* :deep(.base-card-footer) {
	overflow: hidden;
} */

.gallery-card-footer {
	display: flex;
	flex-flow: row wrap;
	overflow: hidden;
	gap: 2px;
	padding: 2px;

	/* opacity: 0; */
	/* visibility: hidden; */
	/* transform: scale(0.8);  */
	transition:
		transform 0.3s,
		opacity 0.3s ease,
		visibility 0.3s ease;

	pointer-events: none;
	* {
		pointer-events: auto;
	}

	// s 标签样式
	:deep(span.re-tag) {
		box-sizing: border-box;
		line-height: 20px;
		padding: 0 4px;
		border: unset;

		.re-tag__content {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	// s 额外标签
	.extra-tag-list {
		flex: 1;
		overflow: hidden;
	}

	.base-tag-list {
		width: 100%;
		display: flex;
		gap: 4px;

		& > * {
			flex: content;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.base-tag-list__title-tag {
			min-width: 40px;
		}

		.base-tag-list__ext-tag,
		.base-tag-list__html-tag,
		.base-tag-list__scale-tag {
			flex-shrink: 0;
		}
	}

	// s 高亮文本样式
	:deep(.highlight-keywords) {
		background-color: yellow;
	}
}

.gallery-card:hover .gallery-card-footer {
	opacity: 1;
	visibility: visible;
	transform: scale(1); /* hover 放大到原始大小 */
	/* transition: transform 0.3s ease 0.3s, opacity 0.3s ease 0.3s, visibility 0.3s ease 0.3s; */
}

.gallery-card[data-show="true"] .gallery-card-footer,
.gallery-card:hover .gallery-card-footer {
	transform: translateY(0);
}

// 进场过渡,退场过渡
.v-enter-from,
.v-leave-to {
	position: absolute;
	opacity: 0;
}

// 进入的过程中
.v-enter-active {
	transition: 0.4s;
}
// 离开的过程中
.v-leave-active {
	transition: 0.4s;
}
</style>
