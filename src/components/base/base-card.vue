<template>
  <div
    ref="container"
    class="base-card__container"
    :data-layout="layout"
    tabindex="0"
  >
    <!-- ? 卡片header -->
    <div class="base-card__header">
      <slot name="header"></slot>
    </div>
    <!-- ? 卡片内容区 -->
    <div class="base-card__content">
      <slot :src="imgUrl" :thumb="imgThumb">
        <!-- ? 默认插槽：BaseImg组件 -->
        <BaseImg
          :src="imgUrl"
          :thumb="imgThumb"
          :use-thumb="useThumb"
          :thumb-max-size="imgThumbMaxSize"
          :observer-once="observerOnce"
          :viewport="viewport"
          @loaded="onLoaded"
          @error="error"
        />
      </slot>
    </div>
    <!-- ? 卡片footer -->
    <div class="base-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, onMounted, ref, useTemplateRef } from "vue";
import type { CSSProperties } from "vue";
import BaseImg from "./base-img.vue";
import type { ImgReadyInfo } from "./base-img.vue";

// ? 定义emits
const emits = defineEmits<{
  loaded: [info: ImgReadyInfo];
  error: [dom: HTMLElement];
  mounted: [];
}>();

// ? 定义props
withDefaults(
  defineProps<{
    /** 卡片图片url */
    imgUrl?: string;
    /** 卡片图片启用缩略图 (可选，默认false) */
    useThumb?: boolean;
    /** 图片缩略图地址 (可选，用于预加载图片) */
    imgThumb?: string;
    /** 生成的缩略图最大尺寸 (可选，默认600px) */
    imgThumbMaxSize?: number;
    /** 卡片布局模式 */
    layout?: "absolute" | "default";
    /** 卡片阴影样式 */
    shadow?: CSSProperties["boxShadow"];
    /** 卡片鼠标悬浮阴影样式 */
    hoverShadow?: CSSProperties["boxShadow"];
    /** 监听视口 (用于设定监听视口，用于图片懒加载) */
    viewport?: IntersectionObserverInit["root"];
    /** 卡片图片的加载只监听一次 */
    observerOnce?: boolean;
  }>(),
  {
    imgUrl: "",
    layout: "absolute",
    shadow: "0 0 4px 0 rgba(0, 0, 0, 0.5)",
    hoverShadow: "0 0 10px 0 rgba(0, 0, 0, 1)",
    imgThumbMaxSize: 600,
    observerOnce: true,
  }
);

// ? 组件挂载时发送触发 emit:mounted
onMounted(() => emits("mounted"));

// ? 组件容器Ref
const container = useTemplateRef("container");

// ? 图片加载完成标识符
const loaded = ref(false);

// f 图片加载完成后的回调
async function onLoaded(info: ImgReadyInfo) {
  loaded.value = true;
  // await nextTick();
  emits("loaded", info);
}

// f 图片失败后的回调
function error() {
  loaded.value = true;
  emits("error", container.value!);
}
</script>

<style lang="scss" scoped>
// 容器基础样式
.base-card__container {
  box-sizing: border-box;
  position: relative; // 设置相对定位，以便于其他内容可以定位到图片上。
  display: flex;
  flex-flow: column;
  box-shadow: v-bind("$props.shadow"); // 阴影效果，根据需要自行调整。
  transition: box-shadow 0.5s; // 过渡效果，使阴影效果更平滑。

  /* background-color: wheat; */

  box-sizing: border-box; // 盒子模型，确保边框不会影响内容的大小。
  * {
    box-sizing: border-box;
  }

  &:focus {
    outline: none;
  }
}
.base-card__container:hover {
  box-shadow: v-bind("$props.hoverShadow"); // 阴影效果，根据需要自行调整。
}

.base-card__content {
  /* flex-grow: 1; */
  flex-shrink: 0;
}

.base-card__header {
  position: relative;
  z-index: 1;
  /* overflow: hidden; */

  pointer-events: none;
  * {
    pointer-events: auto;
  }
}
.base-card__footer {
  position: relative;

  pointer-events: none;
  * {
    pointer-events: auto;
  }
}

.base-card__container[data-layout="absolute"] {
  .base-card__header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .base-card__footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
}
</style>
