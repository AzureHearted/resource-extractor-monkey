<template>
  <!-- s 悬浮按钮 -->
  <div class="fab-container" ref="hoverButtonDOM" :style="style">
    <var-fab
      :show="show && state.mounted"
      v-model:active="active"
      type="primary"
      :fixed="false"
      direction="top"
      :trigger="isMobile ? 'click' : 'hover'"
      :teleport="false"
    >
      <template #trigger>
        <!-- s 图库显示切换按钮 -->
        <n-badge :value="filterCardList.all.length" :max="999" type="default">
          <var-button
            elevation
            type="primary"
            round
            icon-container
            :loading="loading"
            @dblclick.stop="toggleWindow()"
          >
            <!-- 图标 -->
            <icon-mdi-dots-grid style="font-size: 30px" color="black" />
          </var-button>
          <!-- 底部悬浮按钮 -->
          <div class="bottom-fab" :data-active="active || state.scrolling">
            <!--t 页面下滚按钮 -->
            <var-button
              class="scroll-button"
              round
              :loading="state.scrollingToDown"
              @click.stop="toDown"
            >
              <icon-material-symbols-keyboard-double-arrow-down-rounded
                style="font-size: 24px"
                color="black"
              />
            </var-button>
            <!--t 页面上滚按钮 -->
            <var-button
              class="scroll-up"
              round
              :loading="state.scrollingToUp"
              @click.stop="toUp"
            >
              <icon-material-symbols-keyboard-double-arrow-up-rounded
                style="font-size: 24px"
                color="black"
              />
            </var-button>
          </div>
        </n-badge>
      </template>
      <template #default>
        <!-- s 图库 -->
        <n-badge
          :value="filterCardList.all.length"
          :processing="loading"
          :max="999"
          type="default"
        >
          <var-button
            type="success"
            round
            icon-container
            @click.stop="toggleWindow('Gallery')"
          >
            <icon-material-symbols-team-dashboard color="black" />
          </var-button>
        </n-badge>
        <!-- s 方案管理 -->
        <var-button type="info" round @click.stop="toggleWindow('PatternEdit')">
          <icon-material-symbols-box-edit color="black" />
        </var-button>
        <!-- s 收藏 -->
        <var-button type="success" round @click.stop="toggleWindow('Favorite')">
          <icon-mdi-favorite color="red" />
        </var-button>
        <!-- s 设置 -->
        <var-button
          color="rgb(217, 121, 252)"
          round
          @click.stop="toggleWindow('Setting')"
        >
          <icon-ant-design-setting-twotone color="black" />
        </var-button>
        <!-- s 测试窗口 -->
        <var-button
          color="rgb(117, 121, 252)"
          round
          @click.stop="toggleWindow('Test')"
        >
          <icon-material-symbols-experiment-outline color="black" />
        </var-button>
      </template>
    </var-fab>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import {
  useDraggable,
  useElementBounding,
  useElementSize,
  useWindowSize,
} from "@vueuse/core";
import type { Position, UseDraggableReturn } from "@vueuse/core";

import type { FabProps } from "@varlet/ui";
import { isMobile as judgeIsMobile } from "@/utils/common";
import { storeToRefs } from "pinia";
import useGlobalStore from "@/stores/GlobalStore"; //导入全局仓库
import useCardStore from "@/stores/CardStore";
import useLoadingStore from "@/stores/LoadingStore";
import { watch } from "vue";
const globalStore = useGlobalStore();
const { openWindow, tab } = storeToRefs(globalStore);
const cardStore = useCardStore();
const { filterCardList } = storeToRefs(cardStore);
const loadingStore = useLoadingStore();
const { loading } = storeToRefs(loadingStore);

const active = ref(false); // s 控制悬浮按钮的显示状态

// 定义Props
withDefaults(
  defineProps<{
    teleportTo?: string | HTMLElement | false; // 指定浮动按钮的挂载点
    show?: boolean;
  }>(),
  {
    teleportTo: () => "body",
    show: true,
  }
);

// s 移动端标识符
const isMobile = ref(false);
onMounted(() => {
  isMobile.value = judgeIsMobile();
});

// s Fab配置信息
const FabDragConfig = ref<FabProps["drag"]>({
  boundary: {
    top: "20px",
    left: "20px",
    right: "20px",
    bottom: "20px",
  },
});

// s 状态信息
const state = reactive({
  scrolling: false,
  scrollingToDown: false,
  scrollingToUp: false,
  mounted: false,
});

onMounted(() => {
  state.mounted = true;
});

const winSize = useWindowSize({
  includeScrollbar: false,
});

const hoverButtonDOM = ref<HTMLElement>();
const { style, position, isDragging } = useDraggable(hoverButtonDOM, {
  initialValue() {
    const { width, height } = useElementSize(hoverButtonDOM.value);
    return calcPos({
      width: width.value ? width.value : 36,
      height: height.value ? height.value : 36,
      percentX: 0.95,
      percentY: 0.8,
    });
  },
  capture: false,
  preventDefault: true,
  onMove() {
    nextTick(() => {
      handleFixPosSize();
    });
  },
});

watch([winSize.width, winSize.height], () => {
  nextTick(() => {
    handleFixPosSize();
  });
});

onMounted(() => {
  nextTick(() => {
    handleFixPosSize();
  });
});

interface CalcPosOption {
  width: number;
  height: number;
  percentY: number; // 垂直方向百分比(0~1)
  percentX: number; // 水平方向百分比(0~1)
}
// f 计算位置
function calcPos(options: Partial<CalcPosOption>): Position {
  const defaultOptions: CalcPosOption = {
    width: 0,
    height: 0,
    percentY: 0.5,
    percentX: 0.5,
  };
  const { width, height, percentY, percentX } = {
    ...defaultOptions,
    ...options,
  };
  const [x, y] = [
    (winSize.width.value - width) * percentX,
    (winSize.height.value - height) * percentY,
  ];
  return { x, y };
}

// f 修正位置&尺寸
function handleFixPosSize() {
  if (!hoverButtonDOM.value) return;
  const hoverButtonBounding = useElementBounding(hoverButtonDOM.value);
  // s 水平方向纠正
  if (hoverButtonBounding.right.value > winSize.width.value) {
    position.value.x = winSize.width.value - hoverButtonBounding.width.value;
  }
  if (hoverButtonBounding.left.value < 0) {
    position.value.x = 0;
  }

  // s 垂直方向纠正
  if (hoverButtonBounding.bottom.value > winSize.height.value) {
    position.value.y = winSize.height.value - hoverButtonBounding.height.value;
  }
  if (hoverButtonBounding.top.value < 0) {
    position.value.y = 0;
  }
}

// f 切换窗口显示
function toggleWindow(name?: string) {
  active.value = false;
  if (name) {
    tab.value = name;
    openWindow.value = true;
  } else {
    // tab.value = "Gallery";
    openWindow.value = !openWindow.value;
  }
}

const { toUp, toDown } = useScroll();
// f 滚动容器到底部
interface DefaultOptions {
  el: HTMLElement; // 滚动元素
  interval: number; // 滚动间隔
}
function useScroll(options?: Partial<DefaultOptions>) {
  const defaultOptions: DefaultOptions = {
    el: document.documentElement, // 滚动元素
    interval: 0, // 滚动间隔
  };
  const { el, interval } = { ...defaultOptions, ...options };

  let scrollInterval: number | null = null;
  let scrolling = false;

  // f 执行一次滚动操作
  function scrollOnce(direction: "up" | "down"): void {
    if (scrolling) return;

    scrolling = true; // 显示滚动按钮的加载状态
    // 如果触底或触顶都停止滚动标识
    if (
      (el.scrollTop === 0 && direction === "up") ||
      (Number(el.scrollTop.toFixed(0)) + el.clientHeight === el.scrollHeight &&
        direction === "down")
    ) {
      // state.scrollingToUp = false; // 取消显示滚动按钮的加载状态
      // state.scrollingToDown = false; // 取消显示滚动按钮的加载状态
      // state.scrolling = false; // 显示滚动按钮的加载状态
      // scrolling = false;
      // return;
    }

    if (direction === "up") {
      el.scrollBy({
        top: -el.scrollHeight / 4,
        behavior: "smooth",
      });
    } else {
      el.scrollBy({
        top: el.scrollHeight / 4,
        behavior: "smooth",
      });
    }
  }

  window.addEventListener("scrollend", () => {
    // console.log("滚动结束");
    scrolling = false;
  });

  // f 开始执行滚动操作的定时器
  function startScrollInterval(direction: "up" | "down"): void {
    if (scrollInterval) {
      clearInterval(scrollInterval);
    }
    scrolling = false;
    stopScrollInterval();

    state.scrolling = true;

    if (direction === "up") {
      state.scrollingToUp = true; // 取消显示滚动按钮的加载状态
      state.scrollingToDown = false; // 取消显示滚动按钮的加载状态
    } else {
      state.scrollingToDown = true; // 取消显示滚动按钮的加载状态
      state.scrollingToUp = false; // 取消显示滚动按钮的加载状态
    }

    scrollOnce(direction);
    scrollInterval = window.setInterval(() => {
      // console.log(`滚动中:${direction}`);
      scrollOnce(direction);
    }, interval);

    window.addEventListener("wheel", stopScrollInterval, { passive: false });
    window.addEventListener("click", stopScrollInterval, { passive: false });
    window.addEventListener("mousedown", stopScrollInterval, {
      passive: false,
    });
    window.addEventListener("touchmove", stopScrollInterval, {
      passive: false,
    });
  }

  // f 停止执行滚动操作的定时器
  function stopScrollInterval(): void {
    // console.log("滚动停止");
    if (scrollInterval) {
      clearInterval(scrollInterval);
    }
    state.scrolling = false; // 取消显示滚动按钮的加载状态
    state.scrollingToUp = false; // 取消显示滚动按钮的加载状态
    state.scrollingToDown = false; // 取消显示滚动按钮的加载状态

    window.removeEventListener("wheel", stopScrollInterval);
    window.removeEventListener("click", stopScrollInterval);
    window.removeEventListener("mousedown", stopScrollInterval);
    window.removeEventListener("touchmove", stopScrollInterval);
  }

  return {
    toUp: () => startScrollInterval("up"),
    toDown: () => startScrollInterval("down"),
  };
}
</script>

<style lang="scss" scoped>
* {
  touch-action: none;
}

.fab-container {
  position: fixed;
}
:deep(.var-drag) {
  position: unset;
}
// 底部拓展按钮
.bottom-fab {
  position: absolute;
  // background: orange;
  top: 0;
  width: 100%;
  height: 80%;

  z-index: -1;

  display: flex;
  flex-flow: column nowrap;
  flex-direction: column-reverse;
  align-items: center;
  gap: 10px;

  transition: 0.3s;

  &[data-active="true"] {
    height: 310%;
  }
}

:deep(.var-button__content) {
  font-size: 20px;
}

.bottom-fab :deep(.var-button--round) {
  width: 40px;
  height: 40px;
  opacity: 1;
  padding: unset;
  margin: unset;
  transition: 0.5s;
}
.bottom-fab[data-active="false"] {
  :deep(.var-button--round) {
    width: 0;
    height: 0;
    opacity: 0;
    padding: unset;
    margin: unset;
  }
}
</style>
