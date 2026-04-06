<template>
	<BaseCard
		class="re-gallery-card"
		:class="{
			're-gallery-card--dark': globalStore.theme === 'dark',
			're-gallery-card--is-selected': isSelected,
			're-gallery-card--downloading': downloading,
		}"
		:is-skeleton="isSkeleton"
	>
		<!-- s 卡片顶部 -->
		<template #header>
			<n-flex
				class="re-gallery-card__header"
				:size="4"
				:wrap="false"
				@click.stop
				@dblclick.stop
			>
				<n-checkbox
					size="small"
					:checked="isSelected"
					@update:checked="
						(checked: boolean) => $emit('toggle-select', checked)
					"
				>
					<span
						class="re-gallery-card-header-title"
						:title="data.description.content"
					>
						<BaseHighlightText
							:text="data.description.content"
							:keyword="highlightKey"
						>
						</BaseHighlightText>
					</span>
				</n-checkbox>
				<!-- s 删除按钮 -->
				<n-popconfirm
					v-if="showDeleteButton"
					@positive-click="$emit('delete', data.id)"
					positive-text="确定"
					negative-text="取消"
					to=".resource-extractor__notification"
				>
					<template #trigger>
						<n-button size="small" type="error" text>
							<template #icon>
								<icon-material-symbols-delete />
							</template>
						</n-button>
					</template>
					<template #icon>
						<icon-material-symbols-delete />
					</template>
					确认删除？
				</n-popconfirm>
				<!-- s 其他按钮插槽 -->
				<slot name="custom-button" :openUrl="openUrl"></slot>
				<!-- s 重命名 -->
				<n-button type="info" text @click="rename(data)" title="重命名">
					<template #icon>
						<icon-ep-edit />
					</template>
				</n-button>
				<!-- s 在页面中定位 -->
				<n-button
					type="warning"
					text
					@click="toLocate(data)"
					v-if="data.source.dom"
					title="在页面中定位"
				>
					<template #icon>
						<icon-material-symbols-location-on-outline />
					</template>
				</n-button>
				<!-- s 下载(图片或视频类) -->
				<n-button
					v-if="
						(data.source.meta.type === 'image' ||
							data.source.meta.type === 'zip' ||
							data.source.meta.type === 'video' ||
							data.source.meta.type === 'html') &&
						showDownloadButton
					"
					:loading="downloading"
					type="success"
					text
					title="下载"
					@click="emits('download', data.id)"
				>
					<template #icon>
						<icon-material-symbols-download />
					</template>
				</n-button>
				<!-- s 打开(网址类) -->
				<n-button
					v-if="data.source.meta.type === 'html'"
					type="success"
					text
					@click="openUrl(data.source.url)"
					title="打开地址"
				>
					<template #icon>
						<icon-material-symbols-open-in-new-rounded />
					</template>
				</n-button>
				<n-button
					v-if="showFavoriteButton"
					size="small"
					:color="isFavorite ? 'red' : ''"
					text
					@click="$emit('toggle-favorite', !isFavorite)"
				>
					<template #icon>
						<icon-mdi-favorite v-if="isFavorite" />
						<icon-mdi-favorite-border v-else />
					</template>
				</n-button>
			</n-flex>
		</template>
		<!-- s 卡片封面 (图片、视频) -->
		<template #default>
			<div class="re-gallery-card__content" :data-id="data.id">
				<template v-if="data.preview.meta.type === 'image'">
					<!-- s 纯图片类型 -->
					<BaseImg
						v-if="data.source.meta.type === 'image'"
						:src="data.preview.url"
						:viewport="viewport"
						decoding="async"
						:use-thumb="galleryState.allowImgCreateThumb"
						:thumb-max-size="1080"
						:observer-once="observerOnce"
						@loaded="emits('loaded', data.id, $event)"
						:draggable="false"
						:show-loading-animation="false"
					/>
					<!-- s 网页类型(封面图片) -->
					<BaseImg
						v-else
						:src="data.preview.url"
						:viewport="viewport"
						decoding="async"
						:use-thumb="galleryState.allowImgCreateThumb"
						:thumb-max-size="1080"
						:observer-once="observerOnce"
						@loaded="emits('loaded', data.id, $event)"
						:draggable="false"
						:show-loading-animation="false"
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
						hover-anew-start
						loop
						:show-controls="false"
						:src="data.preview.url"
						:viewport="viewport"
						:observer-once="observerOnce"
						:init-width="data.preview.meta.width"
						:init-height="data.preview.meta.height"
						@loaded="emits('loaded', data.id, $event)"
					/>
				</template>
				<!-- s html的其他类型 -->
				<template v-else>
					<BaseImg
						:init-show="true"
						@loaded="emits('loaded', data.id, $event)"
						:draggable="false"
						:show-loading-animation="false"
					>
						<!-- 一个Html的svg图标 -->
						<HtmlTypeImg
							style="width: 100%; height: auto; transform: scale(0.5)"
						/>
					</BaseImg>
				</template>
			</div>
		</template>
		<template #skeleton>
			<div class="re-gallery-card__content" :data-id="data.id">
				<!-- skeleton -->
			</div>
		</template>
		<!-- s 卡片底部 -->
		<template #footer>
			<n-flex class="re-gallery-card__footer" align="center" :size="2">
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
				<n-flex class="base-tag-list" :size="4">
					<!-- s 尺寸信息 -->
					<n-tag
						v-if="data.source.meta.type === 'image'"
						size="small"
						type="primary"
						:title="`${validMeta.width}x${validMeta.height}`"
					>
						{{ validMeta.width }}x{{ validMeta.height }}
					</n-tag>
					<!-- s 扩展名信息 -->
					<n-tag
						v-if="!!data.source.meta.ext && data.source.meta.type != 'html'"
						size="small"
						strong
						type="info"
						:title="data.source.meta.ext"
					>
						{{ data.source.meta.ext }}
					</n-tag>
					<!-- s 网页标签 -->
					<n-tag
						v-if="data.source.meta.type === 'html'"
						type="warning"
						size="small"
						title="网页"
					>
						网页
					</n-tag>
					<!-- s 文件大小信息 -->
					<n-tag
						v-if="!!data.source.blob && !!data.source.blob.size"
						type="success"
						size="small"
						:title="size"
					>
						{{ size }}
					</n-tag>
				</n-flex>
			</n-flex>
		</template>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed, h, ref } from "vue";
import type { ComputedRef } from "vue";
import {
	BaseCard,
	BaseImg,
	BaseVideo,
	BaseHighlightText,
	type BaseImgReadyInfo,
	type BaseVideoReadyInfo,
} from "base-ui";
import BaseLineOverFlowList from "@/components/base/base-line-overflow-list.vue";
import { Card } from "@/models";
import { GM_openInTab } from "$";
import { useDialog } from "@/plugin/naive-ui";
import { NCheckbox } from "naive-ui";
// 导入公用TS库
import { byteAutoUnit, legalizationPathString } from "@/utils";
// 导入svg
import HtmlTypeImg from "@svg/html.svg";
// 导入仓库
import { useGlobalStore } from "@/stores";
import { storeToRefs } from "pinia";
import FilenameInputVue from "./filename-input/filename-input.vue";
import { NButton, NFlex, type FormValidationStatus } from "naive-ui";

const dialog = useDialog();

const globalStore = useGlobalStore();
const { galleryState } = storeToRefs(globalStore);

// s 卡片数据
const data = defineModel<Card>("data", { required: true });

withDefaults(
	defineProps<{
		isSkeleton?: boolean;
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
		/** 选中状态 */
		isSelected?: boolean;
		/** 收藏状态 */
		isFavorite?: boolean;
		/** 下载标识符 */
		downloading?: boolean;
	}>(),
	{
		isSkeleton: false,
		observerOnce: true,
		showCheckBox: true,
		showDeleteButton: true,
		showDownloadButton: true,
		showFavoriteButton: true,
		showToLocateButton: true,
		downloading: false,
	},
);

interface Emits {
	"toggle-select": [value: boolean]; // 选中状态变化事件
	"toggle-favorite": [value: boolean]; // 卡片收藏事件
	loaded: [id: string, info: BaseImgReadyInfo | BaseVideoReadyInfo]; // 卡片加载成功事件
	download: [id: string]; // 下载事件
	delete: [id: string]; // 删除事件
	"save:tags": [id: string, newTags: string[]]; // 卡片tags保存事件
	"change:title": [id: string, title: string]; // 标题变化事件
}

// ? 定义emits
const emits = defineEmits<Emits>();

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
async function rename(card: Card) {
	const initName = card.description.content;

	let res = await new Promise<{ value: string; isOk: boolean }>((resolve) => {
		const text = ref(legalizationPathString(initName));
		const status = ref<FormValidationStatus>("success");
		const allowPositive = computed(() => status.value !== "success");

		const d = dialog.success({
			title: "重命名",
			// 内容自定义
			content() {
				return h(FilenameInputVue, {
					name: text.value,
					label: "新名称：",
					placeholder: "输入要保存的文件名称",
					clearable: true,
					"onUpdate:name": (val) => {
						text.value = val;
					},
					"onUpdata:status": (val) => {
						status.value = val;
					},
				});
			},
			draggable: true,
			closeOnEsc: true,
			// 操作按钮自定义
			action() {
				return h(
					NFlex,
					{ size: 4 },
					{
						default: () => {
							return [
								h(
									NButton,
									{
										type: "default",
										style: "margin-right:12px",
										onClick() {
											resolve({ value: initName, isOk: false });
											d.destroy();
										},
									},
									{ default: () => "取消" },
								),
								h(
									NButton,
									{
										type: "primary",
										disabled: allowPositive.value,
										onClick() {
											resolve({ value: text.value, isOk: true });
											d.destroy();
										},
									},
									{ default: () => "确认" },
								),
							];
						},
					},
				);
			},
			onMaskClick() {
				resolve({ value: initName, isOk: false });
			},
		});
	});

	if (!res.isOk) return;
	card.description.content = legalizationPathString(res.value);

	// 触发标题变化事件;
	emits("change:title", card.id, card.description.content);
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
.re-gallery-card {
	--selectedColor: rgb(24, 160, 88);
	--selected-bgColor: rgba(24, 160, 88, 0.5);
	&--dark {
		--selectedColor: rgb(99, 226, 183);
		--selected-bgColor: rgba(99, 226, 183, 0.5);
	}

	border: unset;

	// 卡片的 header
	&__header {
		display: flex;
		align-items: center;

		overflow: hidden;

		line-height: 1;
		padding: 0 4px;

		backdrop-filter: blur(12px) saturate(1.2);
		-webkit-backdrop-filter: blur(12px) saturate(1.2);
		background-color: rgba(getTheme(light, background), 0.2);

		:deep(.re-n-checkbox) {
			flex: 1;
			overflow: hidden;
			text-wrap: nowrap;
			text-overflow: ellipsis;

			.re-n-checkbox-box-wrapper {
				margin-left: 2px;
			}

			.re-n-checkbox__label {
				overflow: hidden;
				text-wrap: nowrap;
				text-overflow: ellipsis;
			}
		}

		// 卡片 header 暗黑样式
		.re-gallery-card--dark & {
			background-color: rgba(getTheme(dark, background), 0.5);
		}
	}

	// 卡片的 footer
	&__footer {
		overflow: hidden;
		padding: 2px;

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
		}
	}
	// 卡片的 content
	&__content {
		height: 100%;
	}

	// 卡片被选中时候的样式
	&--is-selected {
		.re-gallery-card__header {
			background-color: var(--selected-bgColor);
			:deep(.re-n-checkbox__label) {
				color: getTheme(light, color);
			}
		}
	}

	// 卡片正在下载中的样式
	&--downloading &__content {
		animation: downloading 1s infinite;
	}
}

@keyframes downloading {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(0.8);
	}
	100% {
		transform: scale(1);
	}
}
</style>
