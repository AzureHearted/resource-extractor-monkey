<template>
  <teleport
    :to="teleportTo || 'body'"
    :disabled="!teleportTo"
    v-if="showLayout"
    tag="div"
    class="base-drag-dialog__layout"
  >
    <transition
      name="dialog"
      @before-enter="handleBeforeEnter"
      @enter="handleEnter"
      @after-enter="handleAfterEnter"
      @before-leave="handleBeforeLeave"
      @after-leave="handleAfterLeave"
    >
      <dialog
        v-if="showDialog"
        :data-is-dragging="isDragging || isResizing"
        class="base-drag-dialog"
        ref="dialogDOM"
        v-on-click-outside="handleClickOutside"
        :style="[
          positionStyle,
          {
            width: dialogSize && !updating ? dialogSize.width + 'px' : '',
            height: dialogSize && !updating ? dialogSize.height + 'px' : '',
          },
        ]"
      >
        <!-- 主要内容区 -->
        <div class="base-drag-dialog__main" :style="[dialogStyle]">
          <!-- 背景 -->
          <div class="base-drag-dialog__main__background"></div>
          <!-- s 可拖拽区(header)  -->
          <div
            ref="draggableDOM"
            class="base-drag-dialog__header"
            @dblclick="toggleFullScreen"
            :style="[headerStyle]"
          >
            <slot name="header">
              <!-- s header左侧 -->
              <div class="base-drag-dialog__header__left">
                <!-- s header插槽 -->
                <slot name="header-left">
                  <!-- 默认header -->
                  {{ title }}
                </slot>
              </div>
              <!-- s header右侧 -->
              <div class="base-drag-dialog__header__right" @click.stop>
                <!-- s 全屏切换按钮 -->
                <div
                  v-if="allowFullScreen"
                  class="header__button drag-modal__button-toggle-fullscreen"
                  @click="toggleFullScreen"
                >
                  <i-material-symbols-fullscreen-rounded v-if="!isFullscreen" />
                  <i-material-symbols-close-fullscreen-rounded v-else />
                </div>
                <!-- s 关闭按钮 -->
                <div
                  class="header__button drag-modal__button-close"
                  @click="show = false"
                >
                  <i-ant-design-close />
                </div>
              </div>
            </slot>
          </div>
          <!-- s 主要内容区 -->
          <div
            ref="bodyDOM"
            class="base-drag-dialog__body"
            :style="[bodyStyle]"
          >
            <slot>
              <n-flex vertical :size="4" style="padding: 4px">
                调试
                <n-flex :size="4" :wrap="false">
                  <span style="white-space: nowrap">宽度</span>
                  <n-slider
                    v-if="dialogSize"
                    v-model:value="dialogSize.width"
                    :min="minWidth"
                    :max="winSize.width.value"
                    :step="1"
                  />
                </n-flex>
                <n-flex :size="4" :wrap="false">
                  <span style="white-space: nowrap">高度</span>
                  <n-slider
                    v-if="dialogSize"
                    v-model:value="dialogSize.height"
                    :min="minHeight"
                    :max="winSize.height.value"
                    :step="1"
                  />
                </n-flex>
              </n-flex>
            </slot>
          </div>
          <!-- s 底部区域 -->
          <div
            v-if="slots['footer']"
            class="base-drag-dialog__footer"
            :style="[footerStyle]"
          >
            <!-- s 内容区域插槽 -->
            <slot name="footer"> </slot>
          </div>
        </div>
        <!-- ?四个可拖拽边框和四个控制角 -->
        <div class="base-drag-dialog__resizer__container">
          <!-- s 水平方向边框 -->
          <div
            class="drag-modal-border-horizon"
            v-if="
              !isFullscreen &&
              (allowResize === true || allowResize === 'horizontal')
            "
          >
            <!-- w 左边框 -->
            <div
              draggable
              class="base-drag-dialog__border base-drag-dialog__border__left"
              @mousedown="dragLeftBorder"
            ></div>
            <!-- w 右边框 -->
            <div
              draggable
              class="base-drag-dialog__border base-drag-dialog__border__right"
              @mousedown="dragRightBorder"
            ></div>
          </div>
          <!-- s 垂直方向边框 -->
          <div
            class="drag-modal-border-vertical"
            v-if="
              !isFullscreen &&
              (allowResize === true || allowResize === 'vertical')
            "
          >
            <!-- w 上边框 -->
            <div
              draggable
              class="base-drag-dialog__border base-drag-dialog__border__top"
              @mousedown="dragTopBorder"
            ></div>
            <!-- w 下边框 -->
            <div
              draggable
              class="base-drag-dialog__border base-drag-dialog__border__bottom"
              @mousedown="dragBottomBorder"
            ></div>
          </div>
          <template v-if="allowResize && !isFullscreen">
            <!-- j 左上角控制点 -->
            <div
              draggable
              class="base-drag-dialog__corner base-drag-dialog__corner__lt"
              @mousedown="dragLTCorner"
            ></div>
            <!-- j 右上角控制点 -->
            <div
              draggable
              class="base-drag-dialog__corner base-drag-dialog__corner__rt"
              @mousedown="dragRTCorner"
            ></div>
            <!-- j 右下角控制点 -->
            <div
              draggable
              class="base-drag-dialog__corner base-drag-dialog__corner__rb"
              @mousedown="dragRBCorner"
            ></div>
            <!-- j 左下角控制点 -->
            <div
              draggable
              class="base-drag-dialog__corner base-drag-dialog__corner__lb"
              @mousedown="dragLBCorner"
            ></div>
          </template>
        </div>
      </dialog>
    </transition>
  </teleport>
  <!-- ?默认可拖拽区域 -->
  <teleport :to="boundary || 'body'">
    <div ref="boundaryDOM" class="base-drag-dialog__boundary"></div>
  </teleport>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUpdated,
  onUnmounted,
  onActivated,
  onDeactivated,
  nextTick,
  useSlots,
} from "vue";
import type {
  ComputedRef,
  TeleportProps,
  HTMLAttributes,
  CSSProperties,
} from "vue";
import {
  useDraggable,
  useElementBounding,
  useElementSize,
  useWindowSize,
} from "@vueuse/core";
import type {
  Position,
  UseDraggableReturn,
  UseWindowSizeReturn,
} from "@vueuse/core";
import { vOnClickOutside } from "@vueuse/components";

const props = withDefaults(
  defineProps<{
    closeResetState?: boolean; // s 关闭后重置状态？
    initFullscreen?: boolean; // s 初始全屏？
    initPercentY?: number; // s 初始垂直位置百分比(相对窗口)
    initPercentX?: number; // s 初始水平位置百分比(相对窗口)
    initSize?: { width: number; height: number } | "auto"; // s 初始尺寸
    minWidth?: number; // 最小宽度
    minHeight?: number; // 最小高度
    dialogStyle?: HTMLAttributes["style"]; // dialog整体样式
    headerStyle?: HTMLAttributes["style"]; // header部分样式
    footerStyle?: HTMLAttributes["style"]; // footer部分样式
    bodyStyle?: HTMLAttributes["style"]; // body部分样式
    allowResize?: boolean | "vertical" | "horizontal"; // s 可更改尺寸大小?
    allowFullScreen?: boolean; // s 允许全屏?
    teleportTo?: string; // s 将组件传送到指定位置？
    boundary?: string; // s 限定边界的css选择器(默认使用window)
    clickOutsideClose?: boolean; // s 是否在点击dialog外部元素时关闭dialog?
    title?: string;
  }>(),
  {
    // s 初始尺寸默认值
    initSize: () => {
      return { width: 350, height: 250 };
      // return "auto";
    },
    initPercentX: 0.5,
    initPercentY: 0.5,
    minWidth: 100,
    minHeight: 100,
    clickOutsideClose: true,
  }
);
defineExpose({
  resSetSize,
  resSetPos,
  updateSize,
  handleFixPosSize,
  calcPos,
  toCenter,
});
const emits = defineEmits([
  "before-enter",
  "after-enter",
  "enter",
  "closed",
  "beforeClose",
]);
const slots = useSlots();

// s dialog容器DOM
const dialogDOM = ref<HTMLDialogElement | null>(null);
// s dialog位置
let position: UseDraggableReturn["position"];
// j dialog位置样式
let positionStyle: ComputedRef<HTMLAttributes["style"]>;
// s dialog容器边界信息
const dialogBounding = useElementBounding(dialogDOM);
// s dialog尺寸
let dialogSize:
  | {
      width: number;
      height: number;
    }
  | undefined;
// j dialog尺寸样式
// let sizeStyle: ComputedRef<HTMLAttributes["style"]>;

// s window尺寸
const winSize = useWindowSize(); // s 响应式视口尺寸

// ! 约束边界DOM
const boundaryDOM = ref<HTMLElement | null>(null);
// ! 约束边界DOM的边界信息
const boundaryBounding = useElementBounding(boundaryDOM);

// w 监视可拖拽区域的尺寸变化
watch([boundaryBounding.width, boundaryBounding.height], () => {
  // console.log("boundaryBounding变化");
  if (dialogDOM.value) {
    nextTick(() => {
      handleFixPosSize();
    });
  }
});

// s 可拖拽部分的DOM
const draggableDOM = ref<HTMLElement | null>(null);
// j 是否拖拽中
let isDragging: ComputedRef<boolean>;

// s 标记是否已经初始化了
const isInit = ref(false);
// f 初始化函数
function init() {
  const {
    style,
    position: pos,
    isDragging: dragging,
  } = useDraggable(dialogDOM, {
    handle: draggableDOM,
    preventDefault: true,
    stopPropagation: true,
    containerElement: boundaryDOM,
    initialValue: () => {
      // ! 位置初始化
      // console.log(object);
      let initHeight = 0,
        initWidth = 0;
      // s 判断用户传入的初始尺寸是否为“自动”
      if (props.initSize === "auto") {
        initWidth = dialogDOM.value?.clientWidth || initWidth;
        initHeight = dialogDOM.value?.clientHeight || initHeight;
      } else {
        initWidth = props.initSize.width || initWidth;
        initHeight = props.initSize.height || initHeight;
      }
      // s 计算位置
      const { x, y } = calcPos({
        width: initWidth,
        height: initHeight,
        percentX: props.initPercentX,
        percentY: props.initPercentY,
      });
      // console.log({ x, y });
      return { x, y };
    },
    onMove() {
      boundaryBounding.update();
      dialogBounding.update();
      // ! 防止modal超出边界视口
      nextTick(() => {
        handleFixPosSize();
      });
    },
  });
  // ! 记录响应式数据
  positionStyle = style;
  position = pos;
  isDragging = dragging;
}

// w 监听dialogDOM是否获取到
watch(dialogDOM, (dom) => {
  // console.log("dialogDOM", dom);
  if (dom) {
    // 判断是否需要初始化
    if (!isInit.value) {
      // ! 进行初始化
      isInit.value = true;
      // s 初始化位置
      resSetSize();

      // ! 执行初始化
      init();
      // s 刷新显示状态
      showDialog.value = false;
      nextTick(() => {
        showDialog.value = true;
      });
    } else {
      // ! 已经初始化过了(判断是否重置位置和尺寸)
      if (props.closeResetState) {
        resSetPos();
        resSetSize();
      }

      if (!props.allowResize) {
        // s 如果不允许改变尺寸就重置尺寸
        resSetSize();
      }
    }
  }
});

// f dialog外部点击事件
function handleClickOutside() {
  // console.log('点击了外部');
  if (props.clickOutsideClose) {
    show.value = false;
  }
}

// s 内容区DOM
const bodyDOM = ref<HTMLElement>();

// s 更新标识符
const updating = ref(false);
// f 更新尺寸
function updateSize() {
  return new Promise<void>((resolve) => {
    updating.value = true;
    nextTick(() => {
      stop();
      resSetSize();
      updating.value = false;
      resolve();
    });
  });
}

// f 重置尺寸大小
function resSetSize() {
  if (props.initSize === "auto") {
    if (dialogDOM.value) {
      dialogSize = reactive({
        width: dialogDOM.value.clientWidth,
        height: dialogDOM.value.clientHeight,
      });
    }
  } else {
    dialogSize = reactive({
      width: props.initSize.width,
      height: props.initSize.height,
    });
  }
}

// f 重置位置
function resSetPos() {
  if (!position) return;
  position.value = calcPos({
    width: dialogDOM.value
      ? dialogDOM.value.clientWidth
      : props.initSize !== "auto"
      ? props.initSize.width
      : 0,
    height: dialogDOM.value
      ? dialogDOM.value.clientHeight
      : props.initSize !== "auto"
      ? props.initSize.height
      : 0,
    percentX: props.initPercentX,
    percentY: props.initPercentY,
  });
}

// f 居中
function toCenter(direction: "both" | "vertical" | "horizontal") {
  const { x, y } = calcPos({
    width: dialogDOM.value
      ? dialogDOM.value.clientWidth
      : props.initSize !== "auto"
      ? props.initSize.width
      : 0,
    height: dialogDOM.value
      ? dialogDOM.value.clientHeight
      : props.initSize !== "auto"
      ? props.initSize.height
      : 0,
    percentX: 0.5,
    percentY: 0.5,
  });
  if (direction === "both") {
    position.value = { x, y };
  } else {
    if (direction === "vertical") {
      position.value.y = y;
    } else {
      position.value.x = x;
    }
  }
}

// s 组件是否已挂载
const isMounted = ref(false);
// s 组件是否被冻结
const isFreeze = ref(false);

// ! 是否显示dialog
const show = defineModel("show", { type: Boolean, default: false });
// s 显示dialog
const showDialog = ref(false);
// s 是否显示框架
const showLayout = ref(false);

// w 监听是否显示dialog
watch(
  () => show.value,
  (isShow) => {
    if (isShow) {
      // s 先渲染框架
      showLayout.value = true;
      // s 然后异步渲染dialog
      setTimeout(() => {
        showDialog.value = true;
      });
    } else {
      showDialog.value = false;
    }
  }
);

//* 修复重新挂载后该显示不显示的bug
onMounted(() => {
  if (show.value) {
    show.value = false;
    nextTick(() => {
      show.value = true;
    });
  }
});

// ! 组件挂载时
onMounted(() => {
  // console.log("onMounted");
  isMounted.value = true;
});

// ! 组件卸载时
onUnmounted(() => {
  isMounted.value = false;
});

// ! 组件被激活时
onActivated(() => {
  isFreeze.value = false;
  // ! 被冻结时进行显示/隐藏
  showDialog.value = show.value;
});

// ! 组件被冻结时
onDeactivated(() => {
  isFreeze.value = true;
  // ! 被冻结时进行隐藏
  showDialog.value = false;
});

// f dialog关闭前的回调
function handleBeforeLeave() {
  emits("beforeClose");
}
// f dialog关闭后的回调
function handleAfterLeave() {
  emits("closed");
}

// f dialog进入前的回调
function handleBeforeEnter() {
  emits("before-enter");
  // console.log(
  // 	"before-enter",
  // 	dialogDOM.value?.clientWidth,
  // 	dialogDOM.value?.clientHeight
  // );
}

// f dialog进入时的回调
function handleEnter() {
  emits("enter");
  // console.log(
  // 	"enter",
  // 	dialogDOM.value?.clientWidth,
  // 	dialogDOM.value?.clientHeight,
  // 	winSize.width.value,
  // 	winSize.height.value
  // );
}

// f dialog进入后的回调
function handleAfterEnter() {
  emits("after-enter");
  // console.log(
  // 	"after-enter",
  // 	dialogDOM.value?.clientWidth,
  // 	dialogDOM.value?.clientHeight
  // );
  nextTick(() => {
    handleFixPosSize();
  });
}

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
    (boundaryBounding.width.value - width) * percentX,
    (boundaryBounding.height.value - height) * percentY,
  ];
  return { x, y };
}

// f 修正位置&尺寸
function handleFixPosSize() {
  if (!position || !dialogSize || !dialogDOM.value) return;
  // s 水平方向纠正
  if (dialogSize.width > boundaryBounding.width.value) {
    // s 溢出的处理方式
    const newX = 0,
      newWidth = boundaryBounding.width.value;
    position.value.x = newX;
    dialogSize.width = newWidth;
  } else {
    // s 没有溢出的处理方式
    if (dialogBounding.right.value > boundaryBounding.width.value) {
      position.value.x =
        boundaryBounding.width.value - dialogBounding.width.value;
    }
    if (dialogBounding.left.value < 0) {
      position.value.x = 0;
    }
  }

  // s 垂直方向纠正
  if (dialogSize.height > boundaryBounding.height.value) {
    // s 溢出的处理方式
    const newY = 0,
      newHeight = boundaryBounding.height.value;
    position.value.x = newY;
    dialogSize.height = newHeight;
  } else {
    // s 没有溢出的处理方式

    if (dialogBounding.bottom.value > boundaryBounding.height.value) {
      position.value.y =
        boundaryBounding.height.value - dialogBounding.height.value;
    }
    if (dialogBounding.top.value < 0) {
      position.value.y = 0;
    }
  }
}

// s 是否全屏的标识符
const isFullscreen = ref(false);
// s 记录全屏前的尺寸和位置
const beforePosAndSize = reactive({
  width: 0,
  height: 0,
  x: 0,
  y: 0,
});
// 挂载时判断是否初始全屏
onMounted(() => {
  if (props.initFullscreen) {
    toggleFullScreen();
  }
});
watch(showDialog, (isShow) => {
  if (!isShow && isFullscreen.value) {
    toggleFullScreen();
  }
});
// f 全屏和还原切换
const toggleFullScreen = () => {
  if (!dialogSize || !props.allowFullScreen) return;
  isFullscreen.value = !isFullscreen.value;
  // console.log("双击", isFullscreen.value);
  nextTick(() => {
    if (!dialogSize) return;
    if (isFullscreen.value) {
      // s 全屏前先记录当前位置和尺寸
      beforePosAndSize.x = position.value.x;
      beforePosAndSize.y = position.value.y;
      beforePosAndSize.width = dialogSize.width;
      beforePosAndSize.height = dialogSize.height;
      // s 然后设置全屏位置
      position.value.x = boundaryBounding.x.value;
      position.value.y = boundaryBounding.y.value;
      dialogSize.width = boundaryBounding.width.value;
      dialogSize.height = boundaryBounding.height.value;
    } else {
      // s 还原到全屏前的位置和尺寸
      position.value.x = beforePosAndSize.x;
      position.value.y = beforePosAndSize.y;
      dialogSize.width = beforePosAndSize.width;
      dialogSize.height = beforePosAndSize.height;
    }
    setTimeout(() => {
      nextTick(() => {
        handleFixPosSize();
      });
    });
  });
};

//TODO 拖拽句柄逻辑

const isResizing = ref(false);

// ! 边框拖拽逻辑
// f 左边框拖拽
function dragLeftBorder(e: MouseEvent) {
  // s 判断是否可以修改"水平"方向尺寸
  if (props.allowResize !== true && props.allowResize !== "horizontal") {
    return;
  }
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度和left
  const startWidth = dialogBounding.width.value;
  const startLeft = dialogBounding.left.value;
  const { clientX: startX } = e; // s 起始x坐标
  // console.log("右边框拖拽", e);
  // s 移动
  // f 移动函数
  document.addEventListener("mousemove", handleMove, { passive: false });
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX } = e;
    const deltaX = nowX - startX;
    if (
      startLeft + deltaX >= boundaryBounding.left.value &&
      startWidth - deltaX > props.minWidth
    ) {
      position.value.x = startLeft + deltaX;
      dialogSize.width = startWidth - deltaX;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    // console.log("松开");
    isResizing.value = false;
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 上边框拖拽
function dragTopBorder(e: MouseEvent) {
  // s 判断是否可以修改"垂直"方向尺寸
  if (props.allowResize !== true && props.allowResize !== "vertical") {
    return;
  }
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始高度和top
  const startHeight = dialogBounding.height.value;
  const startTop = dialogBounding.top.value;
  const { clientY: startY } = e; // s 起始x坐标
  // console.log("右边框拖拽", e);
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientY: nowY } = e;
    const deltaY = nowY - startY;
    if (
      startTop + deltaY >= boundaryBounding.left.value &&
      startHeight - deltaY > props.minHeight
    ) {
      position.value.y = startTop + deltaY;
      dialogSize.height = startHeight - deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    // console.log("松开");
    isResizing.value = false;
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 右边框拖拽
function dragRightBorder(e: MouseEvent) {
  // s 判断是否可以修改"水平"方向尺寸
  if (props.allowResize !== true && props.allowResize !== "horizontal") {
    return;
  }
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度和right
  const startWidth = dialogBounding.width.value;
  const startRight = dialogBounding.right.value;
  const { clientX: startX } = e; // s 起始x坐标
  // console.log("右边框拖拽", e);
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX } = e;
    const deltaX = nowX - startX;
    if (
      startRight + deltaX <= boundaryBounding.right.value &&
      startWidth + deltaX > props.minWidth
    ) {
      dialogSize.width = startWidth + deltaX;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 下边框拖拽
function dragBottomBorder(e: MouseEvent) {
  // s 判断是否可以修改"垂直"方向尺寸
  if (props.allowResize !== true && props.allowResize !== "vertical") {
    return;
  }
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始高度和bottom
  const startHeight = dialogBounding.height.value;
  const startBottom = dialogBounding.bottom.value;
  const { clientY: startY } = e; // s 起始Y坐标
  // console.log("下边框拖拽", e);
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientY: nowY } = e;
    const deltaY = nowY - startY;
    if (
      startBottom + deltaY <= boundaryBounding.bottom.value &&
      startHeight + deltaY > props.minHeight
    ) {
      dialogSize.height = startHeight + deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}

// ! 角落拖拽逻辑
// f 左上角控制点拖拽
function dragLTCorner(e: MouseEvent) {
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度、高度和left、bottom
  const startWidth = dialogBounding.width.value;
  const startHeight = dialogBounding.height.value;
  const startModalLeft = dialogBounding.left.value;
  const startTop = dialogBounding.top.value;
  const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX, clientY: nowY } = e;
    const deltaX = nowX - startX;
    const deltaY = nowY - startY;
    // s 判断水平方向
    if (
      startModalLeft + deltaX >= boundaryBounding.left.value &&
      startWidth - deltaX > props.minWidth &&
      (props.allowResize === true || props.allowResize === "horizontal")
    ) {
      position.value.x = startModalLeft + deltaX;
      dialogSize.width = startWidth - deltaX;
    }
    // s 判断垂直方向
    if (
      startTop + deltaY >= boundaryBounding.top.value &&
      startHeight - deltaY > props.minHeight &&
      (props.allowResize === true || props.allowResize === "vertical")
    ) {
      position.value.y = startTop + deltaY;
      dialogSize.height = startHeight - deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 右上角控制点拖拽
function dragRTCorner(e: MouseEvent) {
  if (!dialogSize) return;
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度、高度和right、top
  const startWidth = dialogBounding.width.value;
  const startHeight = dialogBounding.height.value;
  const startRight = dialogBounding.right.value;
  const startTop = dialogBounding.top.value;
  const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX, clientY: nowY } = e;
    const deltaX = nowX - startX;
    const deltaY = nowY - startY;
    // s 判断水平方向
    if (
      startRight + deltaX <= boundaryBounding.right.value &&
      startWidth + deltaX > props.minWidth &&
      (props.allowResize === true || props.allowResize === "horizontal")
    ) {
      dialogSize.width = startWidth + deltaX;
    }
    // s 判断垂直方向
    if (
      startTop + deltaY >= boundaryBounding.top.value &&
      startHeight - deltaY > props.minHeight &&
      (props.allowResize === true || props.allowResize === "vertical")
    ) {
      position.value.y = startTop + deltaY;
      dialogSize.height = startHeight - deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 右下角控制点拖拽
function dragRBCorner(e: MouseEvent) {
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度、高度和right、bottom
  const startWidth = dialogBounding.width.value;
  const startHeight = dialogBounding.height.value;
  const startRight = dialogBounding.right.value;
  const startBottom = dialogBounding.bottom.value;
  const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX, clientY: nowY } = e;
    const deltaX = nowX - startX;
    const deltaY = nowY - startY;
    // s 判断水平方向
    if (
      startRight + deltaX <= boundaryBounding.right.value &&
      startWidth + deltaX > props.minWidth &&
      (props.allowResize === true || props.allowResize === "horizontal")
    ) {
      dialogSize.width = startWidth + deltaX;
    }
    // s 判断垂直方向
    if (
      startBottom + deltaY <= boundaryBounding.bottom.value &&
      startHeight + deltaY > props.minHeight &&
      (props.allowResize === true || props.allowResize === "vertical")
    ) {
      dialogSize.height = startHeight + deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
// f 左下角控制点拖拽
function dragLBCorner(e: MouseEvent) {
  boundaryBounding.update();
  dialogBounding.update();
  // s modal起始宽度、高度和left、bottom
  const startWidth = dialogBounding.width.value;
  const startHeight = dialogBounding.height.value;
  const startModalLeft = dialogBounding.left.value;
  const startBottom = dialogBounding.bottom.value;
  const { clientX: startX, clientY: startY } = e; // s 起始x,y坐标
  // s 移动
  document.addEventListener("mousemove", handleMove, { passive: false });
  // f 移动函数
  function handleMove(e: MouseEvent) {
    isResizing.value = true;
    if (!dialogSize) return;
    const { clientX: nowX, clientY: nowY } = e;
    const deltaX = nowX - startX;
    const deltaY = nowY - startY;
    // s 判断水平方向
    if (
      startModalLeft + deltaX >= boundaryBounding.left.value &&
      startWidth - deltaX > props.minWidth &&
      (props.allowResize === true || props.allowResize === "horizontal")
    ) {
      position.value.x = startModalLeft + deltaX;
      dialogSize.width = startWidth - deltaX;
    }
    // s 判断垂直方向
    if (
      startBottom + deltaY <= boundaryBounding.bottom.value &&
      startHeight + deltaY > props.minHeight &&
      (props.allowResize === true || props.allowResize === "vertical")
    ) {
      dialogSize.height = startHeight + deltaY;
    }
  }
  // s 松开
  document.addEventListener("mouseup", handleDrop, { passive: false });
  // f 松开函数
  function handleDrop() {
    isResizing.value = false;
    // console.log("松开");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleDrop);
  }
}
</script>

<style lang="scss" scoped>
* {
  box-sizing: border-box;
}
// $radius: 4px;
// s dialog容器默认样式
.base-drag-dialog {
  box-sizing: border-box !important;
  position: fixed;

  min-width: v-bind("minWidth+'px'") !important;
  min-height: v-bind("minHeight+'px'") !important;

  max-width: unset;
  max-height: unset;
  padding: unset;
  margin: unset;
  border: unset;
  outline: unset;
  overflow: visible;

  background-color: transparent !important;

  // border-radius: 4px;
  z-index: 2000;

  display: flex;

  &[data-is-dragging="false"] {
    transition: 0.5s ease;
  }

  &[data-show="false"] {
    opacity: 0 !important;
  }

  &::backdrop {
    display: none !important;
    background: unset !important;
  }
}

// s 主要区域
.base-drag-dialog__main {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;

  border: 1px gray solid;
  box-shadow: 0 0 8px 0.5px rgba(0, 0, 0, 0.6),
    inset 0 0 10px 8px rgba(128, 128, 128, 0.6);
  background: rgba(255, 255, 255, 0.8);
}

// s 主要区域背景
.base-drag-dialog__main__background {
  position: absolute;
  overflow: hidden;
  inset: 0;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    -webkit-filter: blur(10px);
    filter: blur(10x);
  }
}

// s header容器默认样式
.base-drag-dialog__header {
  position: relative;

  touch-action: none; // ! 必须设为none否则useDraggable不能正常使用
  /* 禁止选中文字 */
  user-select: none;
  /* 禁止图文拖拽 */
  -webkit-user-drag: none;

  display: flex;
  flex-flow: row nowrap;

  transition: 0.5s ease-in-out;
  background: rgba(255, 255, 255, 0.4);

  &:hover {
    // background: rgb(216, 216, 216);
    background: rgba(180, 180, 180, 0.8);
  }
}

// s header左侧
.base-drag-dialog__header__left {
  flex: auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  // padding: 2px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// s header右侧
.base-drag-dialog__header__right {
  margin-left: auto;
  display: flex;
  flex-flow: row nowrap;
  width: fit-content;
  height: 100%;

  touch-action: auto;

  // s header中的button
  .header__button {
    aspect-ratio: 1;
    width: auto;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.5s ease;
  }
  // s 默认按钮悬浮样式
  .header__button:hover {
    background: rgb(168, 168, 168);
  }
  // s 关闭按钮(悬浮样式)
  .drag-modal__button-close:hover {
    background: rgb(244, 67, 54);
    color: white;
  }
}

// s footer(底部)默认样式
.base-drag-dialog__footer {
  position: relative;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  font-size: 16px;
  padding: 4px 8px;
}

// s body(内容区)默认样式
.base-drag-dialog__body {
  flex: auto;
  padding: 4px;
}

// ! modal控制边框和角
.base-drag-dialog__resizer__container {
  position: absolute;
  inset: 0px;
  $weight: 4px;
  $length: 100%;
  z-index: -1;

  /* 禁止选中文字 */
  user-select: none !important;
  /* 禁止图文拖拽 */
  -webkit-user-drag: none !important;
  // overflow: hidden !important;
  // background-color: green !important;

  // w 四个可拖拽边框
  .base-drag-dialog__border {
    box-sizing: border-box;
    position: absolute !important;
    margin: auto !important;
    opacity: 0;
    background-color: green !important;
    background-color: transparent !important;
    // border: gray 1px solid;

    transition: 0.5s ease;

    &:active,
    &:hover {
      opacity: 1;
      background-color: rgba(153, 205, 50, 1) !important;
    }

    // w 左边框
    &.base-drag-dialog__border__left {
      position: relative;
      left: -$weight !important;
      top: 0 !important;
      bottom: 0 !important;
      width: $weight !important;
      height: $length !important;
      cursor: ew-resize !important;
      border-top-left-radius: $weight;
      border-bottom-left-radius: $weight;
    }
    // w 右边框
    &.base-drag-dialog__border__right {
      right: -$weight !important;
      top: 0 !important;
      bottom: 0 !important;
      width: $weight !important;
      height: $length !important;
      cursor: ew-resize !important;
      border-top-right-radius: $weight;
      border-bottom-right-radius: $weight;
    }
    // w 上边框
    &.base-drag-dialog__border__top {
      top: -$weight !important;
      left: 0 !important;
      right: 0 !important;
      width: $length !important;
      height: $weight !important;
      cursor: ns-resize !important;
      border-top-left-radius: $weight;
      border-top-right-radius: $weight;
    }

    // w 下边框
    &.base-drag-dialog__border__bottom {
      bottom: -$weight !important;
      left: 0 !important;
      right: 0 !important;
      width: $length !important;
      height: $weight !important;
      cursor: ns-resize !important;
      border-bottom-left-radius: $weight;
      border-bottom-right-radius: $weight;
    }
  }
  // j 四个可拖拽角落
  .base-drag-dialog__corner {
    box-sizing: border-box;
    position: absolute !important;
    $width: calc(2 * $weight);
    $height: calc(2 * $weight);
    width: $width !important;
    height: $height !important;
    background-color: rgb(128, 0, 124) !important;
    background-color: transparent !important;
    // border: gray 1px solid;

    box-shadow: unset;
    opacity: 0;
    transition: 0.5s ease;

    &:active,
    &:hover {
      opacity: 1;
      background-color: rgba(153, 205, 50, 1) !important;
    }

    // j 左上角
    &.base-drag-dialog__corner__lt {
      position: relative;
      left: -$weight !important;
      top: -$weight !important;
      cursor: se-resize !important;
      border-top-left-radius: 100%;

      mask: radial-gradient(
        circle at bottom right,
        transparent $weight,
        black $weight
      );
    }
    // j 右上角
    &.base-drag-dialog__corner__rt {
      right: -$weight !important;
      top: -$weight !important;
      cursor: sw-resize !important;
      border-top-right-radius: 100%;

      mask: radial-gradient(
        circle at bottom left,
        transparent $weight,
        black $weight
      );
    }

    // j 右下角
    &.base-drag-dialog__corner__rb {
      right: -$weight !important;
      bottom: -$weight !important;
      cursor: se-resize !important;
      border-bottom-right-radius: 100%;

      mask: radial-gradient(
        circle at top left,
        transparent $weight,
        black $weight
      );
    }

    // j 左下角
    &.base-drag-dialog__corner__lb {
      left: -$weight !important;
      bottom: -$weight !important;
      cursor: sw-resize !important;
      border-bottom-left-radius: 100%;

      mask: radial-gradient(
        circle at top right,
        transparent $weight,
        black $weight
      );
    }
  }
}

//? transition效果
// s	默认淡出淡入
.dialog-enter-active,
.dialog-leave-active {
  transition: 0.5s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  // position: fixed;
  opacity: 0;
  top: 100% !important;
}

// s 默认可拖拽区域样式(约束边界)
.base-drag-dialog__boundary {
  position: fixed;
  margin: auto;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;

  // margin: v-bind("defaultDragZoneMargin");

  pointer-events: none;
}
</style>
