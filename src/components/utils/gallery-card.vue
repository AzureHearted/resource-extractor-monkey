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
                <i-mdi-favorite />
              </template>
              <template #un-checked>
                <i-mdi-favorite-border />
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
                v-ripple
              >
                <template #icon>
                  <i-material-symbols-delete />
                </template>
              </el-button>
            </el-button-group>
            <el-button-group size="small">
              <!-- s 重命名 -->
              <el-button
                type="primary"
                @click="rename(data)"
                title="重命名"
                v-ripple
              >
                <template #icon>
                  <i-ep-edit />
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
                v-ripple
              >
                <template #icon>
                  <i-material-symbols-location-on-outline />
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
                :loading="data.loading"
                type="success"
                title="下载"
                @click="emits('download', data.id)"
                v-ripple
              >
                <template #icon>
                  <i-material-symbols-download />
                </template>
              </el-button>
              <!-- s 打开(网址类) -->
              <el-button
                v-if="data.source.meta.type === 'html'"
                type="default"
                @click="openUrl(data.source.url)"
                title="打开地址"
                v-ripple
              >
                <template #icon>
                  <i-material-symbols-open-in-new-rounded />
                </template>
              </el-button>
            </el-button-group>
          </div>
        </div>
      </div>
    </template>
    <!-- s 卡片主体(图片) -->
    <template #default>
      <div
        ref="imgWrapRef"
        :data-fancybox="data.isMatch ? `web-img-collector` : undefined"
        :data-id="data.id"
        :href="data.source.url"
        :data-type="showType"
        :data-preload="showType === 'iframe' ? false : true"
        :data-thumb="data.preview.url"
        :data-source-type="data.source.type"
        :data-preview-type="data.preview.type"
        :data-download-src="data.source.url"
      >
        <template v-if="data.preview.meta.type === 'image'">
          <!-- s 纯图片类型 -->
          <BaseImg
            v-if="data.source.meta.type === 'image'"
            :src="data.preview.url"
            use-thumb
            :thumb-max-size="1080"
            :viewport-selector="viewportSelector"
            :init-width="data.preview.meta.width"
            :init-height="data.preview.meta.height"
            @mounted="emits('mounted')"
            @loaded="emits('loaded', data.id, $event)"
            @error="emits('error', data.id)"
            :draggable="false"
          />
          <!-- s 网页类型(封面图片) -->
          <BaseImg
            v-else
            use-thumb
            :thumb-max-size="1080"
            :src="data.preview.url"
            :viewport-selector="viewportSelector"
            :init-width="data.preview.meta.width"
            :init-height="data.preview.meta.height"
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
            :viewport-selector="viewportSelector"
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
        <div v-if="data.isLoaded" class="extra-tag-list">
          <BaseLineOverFlowList
            :list="tags"
            model-to=".web-img-collector__top-container"
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
                :title="data.description.title"
                style="
                  font-size: 12px;
                  overflow: inherit;
                  white-space: inherit;
                  text-overflow: inherit;
                "
              >
                {{ data.description.title }}
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
            class="title-tag"
            type="info"
            size="small"
            :title="data.description.title.trim()"
          >
            <!-- {{ data.description.title.trim() }} -->
            <span v-html="description"></span>
          </el-tag>
          <!-- s 尺寸信息 -->
          <el-tag
            v-if="data.source.meta.type === 'image' && data.isLoaded"
            size="small"
            :title="`${data.source.meta.width}x${data.source.meta.height}`"
          >
            {{ data.source.meta.width }}x{{ data.source.meta.height }}
          </el-tag>
          <!-- s 扩展名信息 -->
          <el-tag
            v-if="!!data.source.meta.ext && data.isLoaded"
            size="small"
            :title="data.source.meta.ext"
          >
            {{ data.source.meta.ext }}
          </el-tag>
          <!-- s 网页标签 -->
          <el-tag
            v-if="data.source.meta.type === 'html'"
            type="warning"
            size="small"
            title="网页"
          >
            网页
          </el-tag>
          <!-- s 文件大小信息 -->
          <el-tag
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
import {
  ref,
  computed,
  withDefaults,
  // onMounted,
  // onActivated,
  // onDeactivated,
} from "vue";
import type { ComputedRef, CSSProperties } from "vue";
import BaseCard from "@/components/base/base-card.vue";
import BaseImg from "@/components/base/base-img.vue";
import BaseVideo from "@/components/base/base-video.vue";
import BaseCheckbox from "@/components/base/base-checkbox.vue";
import BaseLineOverFlowList from "@/components/base/base-line-overflow-list.vue";
import Card from "@/stores/CardStore/class/Card";
import type { ImgReadyInfo } from "@/components/base/base-img.vue";
import { GM_openInTab } from "$";
import { ElMessageBox } from "@/plugin/element-plus";

// 导入公用TS库
import { byteAutoUnit, legalizationPathString } from "@/utils/common";

// 导入svg
import HtmlTypeImg from "@svg/html.svg";

// 导入仓库
import useGlobalStore from "@/stores/GlobalStore";

const globalStore = useGlobalStore();

const imgWrapRef = ref<HTMLElement | null>(null);
// s 图片可见性
// const isVisible = useElementVisibility(imgWrapRef);

const data = defineModel<Card>("data", {
  required: true,
  default: () => new Card(),
});

const props = withDefaults(
  defineProps<{
    // data: Card;
    viewportSelector?: string;
    showCheckBox?: boolean;
    showDeleteButton?: boolean;
    showDownloadButton?: boolean;
    showFavoriteButton?: boolean;
    showToLocateButton?: boolean;
    isMobile?: boolean; // s 移动端标识
    highlightKey?: string; // s 高亮关键词
  }>(),
  {
    showCheckBox: true,
    showDeleteButton: true,
    showDownloadButton: true,
    showFavoriteButton: true,
    showToLocateButton: true,
  }
);

// onMounted(() => {
// 	console.log("卡片被挂载", props.data.id);
// });
// onActivated(() => {
// 	console.log("卡片被激活", props.data.id);
// });
// onDeactivated(() => {
// 	console.log("卡片被冻结", props.data.id);
// });

// ? 定义emits
const emits = defineEmits<{
  (e: "change:selected", val: boolean): Promise<void>; // 选中状态变化事件
  (e: "change:title", id: string, val: string): Promise<void>; // 标题变化事件
  (e: "toggle-favorite", val: boolean): Promise<void>; // 卡片收藏事件
  (e: "loaded", id: string, info: ImgReadyInfo): Promise<void>; // 卡片加载成功事件
  (e: "error", id: string): Promise<void>; // 卡片加载失败事件
  (e: "download", id: string): Promise<void>; // 下载事件
  (e: "delete", id: string): Promise<void>; // 删除事件
  (e: "change:visible", val: boolean): Promise<void>; // 可见性发生变化
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

interface Tag {
  id: string;
  label: string;
}
// j 标签
const tags = computed<Tag[]>(() => {
  return data.value.tags.map((t) => {
    return {
      id: crypto.randomUUID(),
      label: t,
    };
  });
});

// j 描述标签
const description = computed<string>(() => {
  const row = data.value.description.title.trim();
  const key = props.highlightKey?.trim();
  let reg: RegExp | undefined;
  if (key && row.includes(key)) {
    reg = new RegExp(key, "gi");
  }
  if (reg) {
    return row.replace(reg, function (k) {
      return /*html*/ `
					<span class="highlight-keywords" >${k}</span>
				`;
    });
  } else {
    return row;
  }
});

// 定义Fancybox的默认类型
type FancyboxType =
  | "image"
  | "iframe"
  | "youtube"
  | "html"
  | "ajax"
  | "html5video"
  | false;
// j 计算默认类型
const showType: ComputedRef<FancyboxType> = computed(() => {
  const { type: metaType } = data.value.source.meta;
  let type: FancyboxType = "image";
  if (!metaType) return type;
  if (metaType === "html") {
    type = "iframe";
  } else if (metaType === "video") {
    type = "html5video";
  }
  return type;
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
  ElMessageBox.prompt(`重命名卡片"${item.description.title}"为……`, "重命名", {
    appendTo: ".web-img-collector__notification-container",
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    inputPlaceholder: "请输入新卡片名称",
    inputValue: legalizationPathString(item.description.title),
    draggable: true,
  })
    .then(({ value: newName }) => {
      // 确认
      item.description.title = legalizationPathString(newName);
      // 触发标题变化事件
      emits("change:title", item.id!, item.description.title);
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
// :deep(.base-card-header) {
// 	overflow: hidden;
// }
.gallery-card-header {
  position: relative;
  display: flex;
  padding: 2px;

  pointer-events: none;
  * {
    pointer-events: auto;
  }
}

:deep(.wic2-button) {
  padding: 2px 4px;
  border: unset;
  box-shadow: var(--el-box-shadow);
  .wic2-icon {
    font-size: 16px;
  }
}

:deep(.base-card__header) {
  overflow: unset;
}
// header左侧
.gallery-card-header-left {
  flex: 0;
  // transform: translateY(-150%);
  transition: transform 0.3s;
}
.gallery-card[data-show="true"] .gallery-card-header-left,
.gallery-card:hover .gallery-card-header-left,
.gallery-card[data-checked="true"] .gallery-card-header-left {
  transform: translateY(0);
  transition: transform 0.3s;
}

// header右侧
.gallery-card-header-right {
  margin-left: auto;
  display: flex;
  flex-flow: row-reverse;
  align-items: center;
}

.card-button-group {
  height: fit-content;
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  // transform: translateY(-150%);
  transform: rotateX(-90deg);

  opacity: 0;
  visibility: hidden;
  transform: scale(0.8); /* 可加轻微缩放效果 */
  transition: transform 0.3s, opacity 0.3s ease, visibility 0.3s ease;
  /* transition: transform 0.2s, opacity 0.2s; */
}

.gallery-card:hover .gallery-card-header-right .card-button-group {
  opacity: 1;
  visibility: visible;
  transform: scale(1); /* hover 放大到原始大小 */
}

.gallery-card[data-show="true"] .gallery-card-header-right .card-button-group,
.gallery-card:hover .gallery-card-header-right .card-button-group {
  pointer-events: auto;
  // transform: translateY(0);
  transform: rotateX(0deg);
  opacity: 1;
  transition: transform 0.2s, opacity 0.2s;
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
:deep(.base-card-footer) {
  overflow: hidden;
}

.gallery-card-footer {
  display: flex;
  flex-flow: row wrap;
  overflow: hidden;
  gap: 2px;
  padding: 2px;

  opacity: 0;
  visibility: hidden;
  transform: scale(0.8); /* 可加轻微缩放效果 */
  transition: transform 0.3s, opacity 0.3s ease, visibility 0.3s ease;

  pointer-events: none;
  * {
    pointer-events: auto;
  }

  // s 标签样式
  :deep(.var-chip),
  :deep(.wic2-tag) {
    flex-basis: content;
    flex-grow: 0;
    flex-shrink: 0.1;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 20px;
    padding: 0 4px;
    border: unset;
    &.title-tag {
      flex-grow: 0;
      flex-shrink: 1000;
      min-width: 40px;
    }
    & > span {
      box-sizing: border-box;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
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
