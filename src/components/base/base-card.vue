<template>
  <div class="base-card__container" :data-layout="layout">
    <!-- 顶部区域 -->
    <div class="base-card__header">
      <slot name="header" :data="data"></slot>
    </div>
    <!-- 图片组件(默认插槽) -->
    <slot :data="data" :src="imgUrl" :thumb="imgThumb">
      <BaseImg
        :src="imgUrl"
        :thumb="imgThumb"
        :use-thumb="useThumb"
        @loaded="loaded"
        @error="error"
      />
    </slot>
    <!-- 底部区域 -->
    <div class="base-card__footer">
      <slot name="footer" :data="data"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入必要的类型和组件
import { withDefaults, computed } from "vue";
import type { CSSProperties } from "vue";
import BaseImg from "./base-img.vue";

// 定义事件
const emit = defineEmits(["loaded", "error"]);

// 定义props
const props = withDefaults(
  defineProps<{
    data?: any;
    imgUrl?: string; // 图片地址，必传参数，用于显示图片
    useThumb?: boolean; // 是否使用缩略图，可选参数，默认false
    imgThumb?: string; // 图片缩略图地址，可选参数，用于预加载图片
    backgroundColor?: string; // 卡片背景颜色，可选参数，默认白色
    layout?: "absolute" | "default";
  }>(),
  {
    data: {},
    imgUrl: "",
    useThumb: false,
    imgThumb: "", // 默认值为空字符串，表示没有缩略图
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    layout: "absolute",
  }
);

// 图片加载完成后的回调
function loaded(...args: any[]) {
  emit("loaded", ...args);
}

// 图片失败后的回调
function error(...args: any[]) {
  emit("error", ...args);
}
</script>

<style lang="scss" scoped>
// 容器基础样式
.base-card__container {
  position: relative; // 设置相对定位，以便于其他内容可以定位到图片上。
  /* display: flex; */
  flex-flow: column;
  border: 1px solid #ccc; // 边框样式，根据需要自行调整。
  box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.5); // 阴影效果，根据需要自行调整。
  transition: box-shadow 0.5s; // 过渡效果，使阴影效果更平滑。

  /* background: v-bind("props.backgroundColor"); */

  box-sizing: border-box; // 盒子模型，确保边框不会影响内容的大小。
  * {
    box-sizing: border-box;
  }
}
.base-card__container:hover {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 1); // 阴影效果，根据需要自行调整。
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
