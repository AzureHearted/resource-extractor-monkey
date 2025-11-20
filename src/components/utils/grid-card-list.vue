<template>
  <div class="grid__container">
    <div
      v-for="(item, index) in list"
      v-show="item.isMatch"
      :key="item.id"
      class="grid__item"
    >
      <slot :item="item" :index="index">
        <BaseCard :src="item.preview.url" :img-url="item.preview.url" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入必要的类型和组件
import {
  ref,
  reactive,
  defineProps,
  withDefaults,
  computed,
  nextTick,
  onMounted,
  watch,
  onActivated,
  onDeactivated,
} from "vue";
import type { CSSProperties } from "vue";

import BaseCard from "@/components/base/base-card.vue";
// import GalleryCard from "./gallery-card.vue";
import type Card from "@/stores/CardStore/class/Card";

// props定义
const props = withDefaults(
  defineProps<{
    data: Card[]; // 数据对象
    itemPadding?: number | string; // 每个item之间的间距。
    itemBaseWidth?: number; // 每个item的基准宽度。
    disenableTransition?: boolean; // 禁用过渡
    loading?: boolean;
  }>(),
  {
    data: () => [] as any[], // 默认值为空数组。
    itemPadding: "2px", // 默认值为
    itemBaseWidth: 220, // 默认值为220。
    disenableTransition: true, // 默认不禁用过渡
    loading: false, // 默认值为false。
  }
);

// 数据信息
const dataInfo = reactive({
  list: [] as Card[],
});

// f 刷新数据
function updateData(rowList: Card[]) {
  nextTick(() => {
    dataInfo.list = rowList;
  });
}

// j 列表信息
const list = computed(() => {
  return dataInfo.list;
});

const mounted = ref(false);

onMounted(() => {
  mounted.value = true;
  updateData(props.data);
});

watch(
  () => props.data,
  (newList) => {
    // console.log("newList", newList);
    updateData(newList);
  }
);

// s 判断组件是否被冻结
const freeze = ref(false);

//* 当组件被激活时执行
onActivated(() => {
  if (!mounted.value) return;
  // console.log("组件==>被激活");
  freeze.value = false;
  updateData(props.data);
});

//* 当组件冻结之前执行(记录每张卡片的位置)
onDeactivated(() => {
  freeze.value = true;
  // console.log("组件==>被冻结");
});
</script>

<style scoped lang="scss">
* {
  box-sizing: border-box;
}
.grid__container {
  display: grid;
  position: relative;
  // grid-template-columns: repeat(auto-fill, 200px);
  @media screen and (min-width: 0px) {
    grid-template-columns: repeat(1, 1fr);
  }
  @media screen and (min-width: 320px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media screen and (min-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media screen and (min-width: 1024px) {
    grid-template-columns: repeat(5, 1fr);
  }
  @media screen and (min-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }
  @media screen and (min-width: 1440px) {
    grid-template-columns: repeat(7, 1fr);
  }
  grid-template-rows: 1fr;
  gap: 4px;
  padding: 4px;
}

.grid__item {
  min-width: 0; // * 解决Grid布局中子元素溢出的问题
  min-height: 0; // 可选
}

.grid__item :deep(.img__wrap img) {
  object-fit: cover;
  height: 100%;
}

.grid__item :deep(.img__container > .img__wrap) {
  aspect-ratio: 1;
  overflow: hidden;
}
</style>
