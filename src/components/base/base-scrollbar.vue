<template>
  <div
    ref="containerDOM"
    class="base-scrollbar_container"
    :class="{
      'arrived-top': arrivedState.top && scrollbar.vertical.lengthPercent < 1,
      'arrived-bottom':
        arrivedState.bottom && scrollbar.vertical.lengthPercent < 1,
      'arrived-left':
        arrivedState.left && scrollbar.horizontal.lengthPercent < 1,
      'arrived-right':
        arrivedState.right && scrollbar.horizontal.lengthPercent < 1,
    }"
    @mouseover="onMouseEnter"
    @mouseleave="onMouseLeave"
    :data-disable="disable"
  >
    <!-- s 视口区滚动区 -->
    <div
      ref="viewportDOM"
      class="base-scrollbar__viewport"
      :style="[viewportStyle]"
    >
      <!-- s 插槽出口 (内容) -->
      <slot></slot>
    </div>
    <!-- t 滚动条 -->
    <div v-show="!disable">
      <teleport :disabled="!teleportTo" :to="teleportTo ? teleportTo : 'body'">
        <!-- t 垂直滚动条 -->
        <div
          ref="verticalTrack"
          class="base-scrollbar__track track__vertical"
          :class="{ 'is-dragging': scrollbar.vertical.isDragging }"
          @click="onClickTrack('vertical', $event)"
        >
          <transition name="scrollbar">
            <div
              ref="verticalThumb"
              class="base-scrollbar__thumb thumb__vertical"
              v-show="verticalScrollbarVisible"
              @mousedown.stop
              @mouseup.stop
              @click.stop
              @touchend.stop
              :style="[verticalStyle]"
            ></div>
          </transition>
        </div>
        <!-- t 水平滚动条 -->
        <div
          ref="horizontalTrack"
          class="base-scrollbar__track track__horizontal"
          @click="onClickTrack('horizontal', $event)"
        >
          <transition name="scrollbar">
            <div
              ref="horizontalThumb"
              class="base-scrollbar__thumb thumb__horizontal"
              :class="{ 'is-dragging': scrollbar.horizontal.isDragging }"
              v-show="horizontalScrollbarVisible"
              @mousedown.stop
              @mouseup.stop
              @click.stop
              @touchend.stop
              :style="[horizontalStyle]"
            ></div>
          </transition>
        </div>
      </teleport>
    </div>
    <!-- t 回到顶部按钮 -->
    <transition name="back-top">
      <div
        class="base-scrollbar__back-top"
        v-show="bakctopShow && showBackTopButton"
        @click="backToTop"
      >
        <i class="back-top__icon">
          <svg
            data-v-e6ff9537=""
            viewBox="0 0 1024 1024"
            width="1.2em"
            height="1.2em"
          >
            <path fill="currentColor" d="M512 320L192 704h639.936z"></path>
          </svg>
        </i>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  defineProps,
  withDefaults,
  onActivated,
  onDeactivated,
  useTemplateRef,
  onUnmounted,
} from "vue";
import type {
  ComputedRef,
  CSSProperties,
  HTMLAttributes,
  TeleportProps,
} from "vue";

// ? 引入vueuse的方法
import {
  useScroll,
  useElementBounding,
  useDraggable,
  useResizeObserver,
  useMutationObserver,
} from "@vueuse/core";

// ? 告诉 Vue 不要自动将 attrs（包括 style, class, data-*等）应用到根元素
defineOptions({
  inheritAttrs: false,
});

// 定义props
const props = withDefaults(
  defineProps<{
    /** 禁用虚拟滚动条（改用原生滚动条） */
    disable?: boolean;
    /** 垂直方向的 overflow */
    overflowY?: CSSProperties["overflowY"];
    /** 水平方向的 overflow */
    overflowX?: CSSProperties["overflowX"];
    /** 显示滚动条 */
    showScrollbar?: boolean;
    /** 显示回到顶部按钮？ */
    showBackTopButton?: boolean;
    /** 滚动条的track尺寸（宽度） */
    trackSize?: number;
    /** 滚动条的track的padding尺寸（宽度）会影响thumb的视觉尺寸 */
    thumbPadding?: number;
    /** 鼠标悬浮在track上时padding尺寸（宽度）会影响thumb的视觉尺寸 */
    hoverThumbPadding?: number;
    /** 滚动条偏移量 [ `垂直滚动条的横向偏移`px , `水平滚动条的纵向偏移`px ] */
    offset?: [number, number];
    /** 将滚动条传送到指定元素 (默认false不传送) */
    teleportTo?: TeleportProps["to"] | false;
    /** 视口样式，为防止计算出错请勿设置 padding 和 margin */
    viewportStyle?: HTMLAttributes["style"];
    /** 自动隐藏thumb */
    autoHidden?: boolean;
  }>(),
  {
    overflowX: "auto",
    overflowY: "auto",
    showScrollbar: true,
    showBackTopButton: false,
    trackSize: 12,
    thumbPadding: 2,
    hoverThumbPadding: 0,
    offset: () => [1, 1],
    teleportTo: false,
    autoHidden: false,
  }
);

// s 组件容器
const containerDOM = useTemplateRef("containerDOM");
const containerInfo = reactive({
  width: 0,
  height: 0,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  x: 0,
  y: 0,
});

useResizeObserver(containerDOM, (entries) => {
  const entry = entries[0];
  const { width, height, left, top, right, bottom, x, y } = entry.contentRect;
  containerInfo.width = width;
  containerInfo.height = height;
  containerInfo.left = left;
  containerInfo.top = top;
  containerInfo.right = right;
  containerInfo.bottom = bottom;
  containerInfo.x = x;
  containerInfo.y = y;
  // console.log("containerDOM尺寸变化", entries);
});

// s 视口容器
const viewportDOM = useTemplateRef("viewportDOM");
const viewportInfo = reactive({
  width: 0,
  height: 0,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  x: 0,
  y: 0,
});

// ? 无论是视口尺寸变化还是内容区尺寸变化都需要更新滚动条
useResizeObserver(viewportDOM, (entries) => {
  const entry = entries[0];
  const { width, height, left, top, right, bottom, x, y } = entry.contentRect;
  viewportInfo.width = width;
  viewportInfo.height = height;
  viewportInfo.left = left;
  viewportInfo.top = top;
  viewportInfo.right = right;
  viewportInfo.bottom = bottom;
  viewportInfo.x = x;
  viewportInfo.y = y;

  scheduleUpdateThumb();
});

// 监听视口的内 DOM 树的变更
const { stop: stopMutationObserver } = useMutationObserver(
  viewportDOM,
  (_mutations) => {
    scheduleUpdateThumb();
  },
  {
    childList: true,
    subtree: true,
    attributes: true,
  }
);
// 卸载组件是取消监听
onUnmounted(() => stopMutationObserver());

let scheduled = false;
function scheduleUpdateThumb() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    measure();
    updateThumb();
    scheduled = false;
  });
}

// 更新函数
function updateThumb() {
  calcThumbSize(); //计算滚动条尺寸
  setThumbPosition(); //计算滚动条位置
}

// s 滚动条状态数据
const scrollbar = reactive({
  show: !props.autoHidden,
  vertical: {
    width: 8, // 滚动条宽度，根据实际情况调整
    length: -1, // -1 表示默认无滚动条
    top: 0, // 滚动条位置
    isDragging: false,
    lengthPercent: 0,
  },
  horizontal: {
    width: 8, // 滚动条宽度，根据实际情况调整
    length: -1, // -1 表示默认无滚动条
    left: 0, // 滚动条位置
    isDragging: false,
    lengthPercent: 0,
  },
});

// ? 记录器: 用于记录冻结前的进度条百分比
const recorder = {
  viewportInfo: {} as typeof viewportInfo,
  verticalTrackInfo: {} as typeof verticalTrackInfo,
  horizontalTrackInfo: {} as typeof horizontalTrackInfo,
  scrollbar: {
    vertical: {
      length: 0,
      lengthPercent: 0,
      top: 0,
    },
    horizontal: {
      length: 0,
      lengthPercent: 0,
      left: 0,
    },
  },
};

// s 标记组件是否被冻结
const freeze = ref(false);

// * 组件被冻结时
onDeactivated(() => {
  recorder.viewportInfo = {
    ...viewportInfo,
  };
  recorder.verticalTrackInfo = {
    ...verticalTrackInfo,
  };
  recorder.horizontalTrackInfo = {
    ...horizontalTrackInfo,
  };
  recorder.scrollbar.vertical.top = scrollbar.vertical.top;
  recorder.scrollbar.vertical.lengthPercent = scrollbar.vertical.lengthPercent;
  recorder.scrollbar.horizontal.left = scrollbar.horizontal.left;
  recorder.scrollbar.horizontal.lengthPercent =
    scrollbar.horizontal.lengthPercent;

  freeze.value = true;
  // console.log("冻结组件");
});

// * 组件被解冻时
onActivated(() => {
  // console.log("解冻组件", recorder);
  requestAnimationFrame(() => {
    const { scrollWidth, scrollHeight } = viewportDOM.value!;
    // const { height, width } = recorder.viewportInfo;
    const { height } = recorder.verticalTrackInfo;
    const { width } = recorder.horizontalTrackInfo;
    let top = (scrollHeight / height) * recorder.scrollbar.vertical.top;
    let left = (scrollWidth / width) * recorder.scrollbar.horizontal.left;
    top = top > 0 ? top : 0;
    left = left > 0 ? left : 0;
    // console.log(left, top);
    updateScrollPosition({ x: left, y: top, behavior: "instant" });
    freeze.value = false;
  });
});

// f 可滚动对象
const {
  x: viewportScrollX,
  y: viewportScrollY,
  measure,
  arrivedState,
} = useScroll(viewportDOM, {
  // idle: 0,
  observe: {
    mutation: true,
  },
  onScroll() {
    requestAnimationFrame(() => {
      if (scrollbar.vertical.isDragging || scrollbar.horizontal.isDragging)
        return;
      measure();
      calcThumbSize();
      setThumbPosition();
    });
  },
});

// s 滚动条轨道DOM (垂直)
const verticalTrackDOM = useTemplateRef("verticalTrack");
// s 滚动条轨道尺寸信息 (垂直)
const verticalTrackInfo = reactive({
  ...useElementBounding(verticalTrackDOM),
});
// s 滚动条DOM (垂直)
const verticalThumbDOM = useTemplateRef("verticalThumb");
let verticalRafId: number | null = null;
useDraggable(verticalThumbDOM, {
  axis: "y", // 限制垂直拖拽
  containerElement: verticalTrackDOM, // 设置父容器
  preventDefault: true,
  onStart({ y: _y }) {
    scrollbar.vertical.isDragging = true;
  },
  onMove({ y }) {
    if (verticalRafId) cancelAnimationFrame(verticalRafId);
    verticalRafId = requestAnimationFrame(() => {
      calcVerticalThumbPosition(y);
      verticalRafId = null;
    });
  },
  async onEnd({ y: _y }) {
    scrollbar.vertical.isDragging = false;
  },
});

// f 设置垂直滚动条位置
function calcVerticalThumbPosition(
  y: number,
  behavior: ScrollBehavior = "instant"
) {
  // ? 防止滚动条超出轨道最大长度
  if (
    y + (verticalTrackInfo.height * scrollbar.vertical.lengthPercent) / 2 >
    verticalTrackInfo.height
  ) {
    y =
      verticalTrackInfo.height -
      verticalTrackInfo.height * scrollbar.vertical.lengthPercent;
  }
  // ? 防止滚动条超出轨道最小长度
  if (y < 0) y = 0;
  // 计算滚动距离
  if (!viewportDOM.value) return;
  const { scrollHeight } = viewportDOM.value; // 提取滚动容器内容区宽度
  const top = (scrollHeight / viewportInfo.height) * y;
  // const left = (scrollWidth / viewportInfo.width) * scrollbar.horizontal.left;
  // 更新滚动距离
  requestAnimationFrame(() => {
    updateScrollPosition({ y: top, behavior });
    scrollbar.vertical.top = y; // 更新滚动条位置
  });
}

// j 滚动条样式(垂直)
const verticalStyle: ComputedRef<CSSProperties> = computed(() => {
  return {
    // 根据滚动条长度决定是否显示滚动条
    height: `${scrollbar.vertical.lengthPercent * 100}%`,
    transform: `translateY(${scrollbar.vertical.top}px)`,
  };
});

// j 垂直滚动条可见性
const verticalScrollbarVisible = computed<boolean>(() => {
  return (
    ((scrollbar.show &&
      scrollbar.vertical.lengthPercent > 0 &&
      scrollbar.vertical.lengthPercent < 1) ||
      scrollbar.vertical.isDragging) &&
    props.showScrollbar &&
    (props.overflowY === "auto" || props.overflowY === "scroll")
  );
});

// s 滚动条轨道DOM (水平)
const horizontalTrackDOM = useTemplateRef("horizontalTrack");
// s 滚动条轨道尺寸信息 (水平)
const horizontalTrackInfo = reactive({
  ...useElementBounding(horizontalTrackDOM),
});
// s 滚动条DOM (水平)
const horizontalThumbDOM = useTemplateRef("horizontalThumb");
let horizontalRafId: number | null = null;
const { x: _x } = useDraggable(horizontalThumbDOM, {
  axis: "x", // 限制水平拖拽
  containerElement: horizontalTrackDOM, // 设置父容器
  preventDefault: true,
  onStart({ x: _x }) {
    scrollbar.horizontal.isDragging = true;
  },
  onMove({ x }) {
    if (horizontalRafId) cancelAnimationFrame(horizontalRafId);
    horizontalRafId = requestAnimationFrame(() => {
      calcHorizontalThumbPosition(x);
      horizontalRafId = null;
    });
  },
  async onEnd({ x: _x }) {
    scrollbar.horizontal.isDragging = false;
  },
});

// f 设置水平滚动条位置
function calcHorizontalThumbPosition(
  x: number,
  behavior: ScrollBehavior = "instant"
) {
  // ? 防止滚动条超出轨道最大长度
  if (
    x + (horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent) / 2 >
    horizontalTrackInfo.width
  ) {
    x =
      horizontalTrackInfo.width -
      horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent;
  }
  // ? 防止滚动条超出轨道最小长度
  if (x < 0) x = 0;
  // 计算滚动距离
  if (!viewportDOM.value) return;
  const { scrollWidth } = viewportDOM.value; // 提取滚动容器内容区宽度
  const left = (scrollWidth / viewportInfo.width) * x;
  // 更新滚动距离
  requestAnimationFrame(() => {
    updateScrollPosition({ x: left, behavior });
    scrollbar.horizontal.left = x; // 更新滚动条位置
  });
}

// j 滚动条样式(水平)
const horizontalStyle: ComputedRef<CSSProperties> = computed(() => {
  return {
    // 根据滚动条长度决定是否显示滚动条
    width: `${scrollbar.horizontal.lengthPercent * 100}%`,
    transform: `translateX(${scrollbar.horizontal.left}px)`,
  };
});

// j 水平滚动条可见性
const horizontalScrollbarVisible = computed<boolean>(() => {
  return (
    ((scrollbar.show &&
      scrollbar.horizontal.lengthPercent > 0 &&
      scrollbar.horizontal.lengthPercent < 1) ||
      scrollbar.horizontal.isDragging) &&
    props.showScrollbar &&
    (props.overflowX === "auto" || props.overflowX === "scroll")
  );
});

/**
 * f 获取track长度相对于可滚动长度的百分占比 (同时等于滚动条长度应该占track长度的百分比)
 * @param scrollContentLen 可滚内容总长度
 * @param viewportLen 视口长度
 * @param {number} 范围：0.0 ~ 1.0
 */
function getThumbSizePercentage(scrollContentLen: number, viewportLen: number) {
  return viewportLen / scrollContentLen;
}

// f 计算滚动条尺寸
function calcThumbSize() {
  if (!viewportDOM.value) return;
  // ? 提取滚动容器内容区宽高
  const { scrollWidth, scrollHeight } = viewportDOM.value;
  const { width, height } = viewportInfo;
  // 计算垂直滚动条长度
  scrollbar.vertical.lengthPercent =
    scrollHeight > height + 0.5
      ? getThumbSizePercentage(scrollHeight, height)
      : 1;
  // 计算水平滚动条长度
  scrollbar.horizontal.lengthPercent =
    scrollWidth > width + 0.5 ? getThumbSizePercentage(scrollWidth, width) : 1;
}

// f 设置滚动条位置
function setThumbPosition() {
  if (!viewportDOM.value) return;
  // 视口宽高
  const { width, height } = viewportInfo;
  // scroll区宽高
  const { scrollWidth, scrollHeight } = viewportDOM.value;
  let top = (height / scrollHeight) * viewportScrollY.value;
  let left = (width / scrollWidth) * viewportScrollX.value;
  if (
    top + (verticalTrackInfo.height * scrollbar.vertical.lengthPercent) / 2 >
    verticalTrackInfo.height
  ) {
    top =
      verticalTrackInfo.height -
      verticalTrackInfo.height * scrollbar.vertical.lengthPercent;
  }
  if (
    left +
      (horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent) / 2 >
    horizontalTrackInfo.width
  ) {
    left =
      horizontalTrackInfo.width -
      horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent;
  }
  // 更新滚动条位置
  scrollbar.vertical.top = top;
  scrollbar.horizontal.left = left;
  // console.log("滚动事件",scrollbar);
}

// f 设置scroll区域的滚动位置
function updateScrollPosition(options: {
  x?: number;
  y?: number;
  behavior?: ScrollBehavior;
}) {
  if (!viewportDOM.value) return;
  const { x, y, behavior } = options;
  if (behavior !== undefined) {
    viewportDOM.value.scrollTo({ top: y, left: x, behavior });
  } else {
    measure();
    if (x !== undefined) {
      viewportScrollX.value = x;
    }
    if (y !== undefined) {
      viewportScrollY.value = y;
    }
  }
}

// f 点击Track时的事件
function onClickTrack(direction: "vertical" | "horizontal", e: MouseEvent) {
  // ? 立即显示进度条
  scrollbar.show = true;
  if (!viewportDOM.value) return;
  const { scrollWidth, scrollHeight } = viewportDOM.value; // 提取滚动容器内容区宽度
  if (direction === "vertical") {
    const clickPos = e.offsetY;
    const { length, top } = scrollbar.vertical;
    // 计算滑块应该到达的位置
    const delta = clickPos - (top + length / 2);
    let y = top + delta;
    // ? 防止滚动条超出轨道最大长度
    if (
      y + (verticalTrackInfo.height * scrollbar.vertical.lengthPercent) / 2 >
      verticalTrackInfo.height
    ) {
      y =
        verticalTrackInfo.height -
        verticalTrackInfo.height * scrollbar.vertical.lengthPercent;
    }
    // ? 防止滚动条超出轨道最小长度
    if (y < 0) y = 0;
    // ? 计算要滚动的实际scrollY
    const scrollY = y * (scrollHeight / verticalTrackInfo.height);
    requestAnimationFrame(() => updateScrollPosition({ y: scrollY }));
  } else {
    const clickPos = e.offsetX;
    const { length, left } = scrollbar.horizontal;
    // 计算滑块应该到达的位置
    const delta = clickPos - (left + length / 2);
    let x = left + delta;
    // ? 防止滚动条超出轨道最大长度
    if (
      x + (horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent) / 2 >
      horizontalTrackInfo.width
    ) {
      x =
        horizontalTrackInfo.width -
        horizontalTrackInfo.width * scrollbar.horizontal.lengthPercent;
    }
    // ? 防止滚动条超出轨道最小长度
    if (x < 0) x = 0;
    // ? 计算要滚动的实际scrollY
    const scrollX = x * (scrollWidth / horizontalTrackInfo.width);
    requestAnimationFrame(() => updateScrollPosition({ x: scrollX }));
  }
}

// f 鼠标进入视口时候的回调
function onMouseEnter(_e: MouseEvent) {
  // ? 立即显示进度条
  scrollbar.show = true;
}

// f 鼠标离开视口时候的回调
function onMouseLeave(_e: MouseEvent) {
  if (!props.autoHidden) return;
  // scrollbar.show = false;
}

// f backTop 回到顶部按钮
const bakctopShow = computed<Boolean>(() => {
  return scrollbar.vertical.top > 20;
});

// f 执行回到顶部
function backToTop() {
  requestAnimationFrame(() => updateScrollPosition({ y: 0 }));
}
</script>

<script lang="ts">
export default {
  name: "BaseScrollbar", // 组件名，用于调试和注册组件时使用
};
</script>

<style lang="scss" scoped>
// s 组件容器
.base-scrollbar_container {
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  /* overflow: hidden; */
  &::after {
    position: absolute;
    content: "";
    opacity: 0;
    transition: 0.5s ease;
  }

  &.arrived-top {
  }
  &.arrived-left {
  }
  &.arrived-right {
  }
  &.arrived-bottom {
    &::after {
      /* position: absolute; */
      /* opacity: 1; */
      content: "到底部了！";
      bottom: 0;
      width: 100%;
      height: 20px;
      text-align: center;
      background-color: hsla(189, 100%, 50%, 0.5);
      /* transition: 0.5s ease 0.5s; */
    }
  }
}

// s 视口
.base-scrollbar__viewport {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  /* scroll-behavior: smooth; */
  overflow-y: v-bind("props.overflowY");
  overflow-x: v-bind("props.overflowX");
  transition: 0.5 ease;
}

// ? 去除原生滚动条样式
.base-scrollbar_container[data-disable="false"] {
  .base-scrollbar__viewport::-webkit-scrollbar {
    display: none !important;
    scrollbar-width: none !important; /* Firefox */
    -ms-overflow-style: none !important; /* IE 10+ */
  }
}

$track-size: v-bind("$props.trackSize");
$track-padding: v-bind("$props.thumbPadding");
$track-hover-padding: v-bind("$props.hoverThumbPadding");

// z 虚拟滚动条track (共通样式)
.base-scrollbar__track {
  position: absolute;
  /* background: rgba(255, 166, 0, 0.573); */

  user-select: none;
  -webkit-user-select: none;

  // z 虚拟滚动条(共通)
  .base-scrollbar__thumb {
    position: absolute;
    inset: 0;
    /* background: rgba(255, 0, 0, 0.5); */

    // ? 滚动条thumb视觉区域
    &::after {
      border-radius: 10px;
      -webkit-box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.5),
        0 0 2px rgb(0, 0, 0, 1);
      box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.5),
        0 0 2px rgb(0, 0, 0, 1);

      background: rgb(85, 170, 255);
      opacity: 1;
      z-index: 1;

      transition: background 0.5s ease, opacity 0.5s ease, left 0.5s ease,
        right 0.5s ease, top 0.5s ease, bottom 0.5s ease, inset 0.5s ease;
    }

    &:hover,
    &.is-dragging {
      &::after {
        background: rgba(64, 160, 255);
      }
    }
    &:active {
      &::after {
        background: rgb(26, 139, 252);
      }
    }
  }

  // z thumb 进入和退出时的过渡
  .scrollbar-enter-from,
  .scrollbar-leave-to {
    position: absolute;
    opacity: 0;
  }

  // 进入的过程中
  .scrollbar-enter-active {
    transition: 0.5s ease;
  }
  // 离开的过程中
  .scrollbar-leave-active {
    transition: 0.5s ease;
  }
}

// z 虚拟滚动条track (垂直)
.track__vertical {
  top: 0;
  right: 0;
  width: calc($track-size * 1px);
  /* height: calc(v-bind("containerInfo.height") * 1px); */
  height: 100%;

  transform: translateX(calc(v-bind("props.offset[0]") * -1px));

  // z 虚拟滚动条thumb(垂直)
  .thumb__vertical {
    top: 0;
    transition: height 0.5s ease;

    // ? 滚动条thumb视觉区域
    &::after {
      position: absolute;
      content: "";
      inset: calc($track-padding * 1px);
    }
  }

  &:hover .thumb__vertical::after,
  &.is-dragging .thumb__vertical::after {
    inset: calc($track-hover-padding * 1px);
  }
}

// z 虚拟滚动条track (水平)
.track__horizontal {
  left: 0;
  bottom: 0;
  /* width: calc(v-bind("containerInfo.width") * 1px); */
  width: 100%;
  height: calc($track-size * 1px);

  transform: translateY(calc(v-bind("props.offset[1]") * -1px));

  // z 虚拟滚动条(水平)
  .thumb__horizontal {
    left: 0;
    transition: width 0.5s ease;

    // ? 滚动条thumb视觉区域
    &::after {
      position: absolute;
      content: "";
      inset: calc($track-padding * 1px);
    }
  }

  // ? thumb 的拖拽和hover样式
  &:hover .thumb__horizontal::after,
  &.is-dragging .thumb__horizontal::after {
    inset: calc($track-hover-padding * 1px);
  }
}

// s 返回顶部按钮样式
.base-scrollbar__back-top {
  position: absolute;
  width: 40px;
  height: 40px;

  right: 40px;
  bottom: 40px;

  border-radius: 50%;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0px 0px 6px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  z-index: 5;
  background-color: #ffffff;

  transition: 0.5s ease;

  &:hover {
    background-color: #d0e3ff;
  }

  .back-top__icon {
    --color: inherit;
    height: 1em;
    width: 1em;
    line-height: 1em;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    fill: currentColor;
    color: var(--color);
    font-size: inherit;
  }
}

// s back-top按钮进入和退出时的过渡
.back-top-enter-active {
  transition: opacity 0.3s;
}
.back-top-leave-active {
  transition: opacity 0.3s ease 0.5s;
}
.back-top-enter-from,
.back-top-leave-to {
  opacity: 0;
}
</style>
