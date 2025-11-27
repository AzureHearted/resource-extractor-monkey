<template>
  <div
    ref="container"
    class="img__container"
    :class="{ loading: !state.loaded }"
  >
    <!-- ? 图片的wrap -->
    <div
      ref="imgWrapRef"
      class="img__wrap"
      :class="{
        loading: !state.loaded,
        show: state.show,
        error: state.isError,
      }"
    >
      <!-- ? 默认插槽 (可替换为其他元素) -->
      <slot>
        <!-- ? 默认插槽：img元素 -->
        <img
          v-if="mounted"
          ref="imgRef"
          v-lazy.src="src"
          :draggable="draggable"
          v-bind="attrs"
        />
      </slot>
    </div>

    <div class="img__other">
      <!-- ? 插槽：其他内容 -->
      <slot name="other"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入工具函数
import {
  ref,
  reactive,
  computed,
  defineProps,
  withDefaults,
  defineEmits,
  watch,
  nextTick,
  onMounted,
  useSlots,
  useAttrs,
  onUnmounted,
  useTemplateRef,
} from "vue";
import type { Directive } from "vue";

// ? 加载错误时显示的图片
const errorImg =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTIgMmgyMHYxMGgtMlY0SDR2OS41ODZsNS01TDE0LjQxNCAxNEwxMyAxNS40MTRsLTQtNGwtNSA1VjIwaDh2Mkgyem0xMy41NDcgNWExIDEgMCAxIDAgMCAyYTEgMSAwIDAgMCAwLTJtLTMgMWEzIDMgMCAxIDEgNiAwYTMgMyAwIDAgMS02IDBtMy42MjUgNi43NTdMMTkgMTcuNTg2bDIuODI4LTIuODI5bDEuNDE1IDEuNDE1TDIwLjQxNCAxOWwyLjgyOSAyLjgyOGwtMS40MTUgMS40MTVMMTkgMjAuNDE0bC0yLjgyOCAyLjgyOWwtMS40MTUtMS40MTVMMTcuNTg2IDE5bC0yLjgyOS0yLjgyOHoiLz48L3N2Zz4=";

// ? 定义props
const props = withDefaults(
  defineProps<{
    /** 图片src */
    src?: string;
    /** 图片初始高度 */
    initWidth?: number;
    /** 图片初始宽度 */
    initHeight?: number;
    /** 使用缩略图 */
    useThumb?: boolean;
    /** 缩略图路径 */
    thumb?: string;
    /** 缩略图最大尺寸 (当启用缩略图但没有传入有效 `thumb` 时生效, 会尝试自动生成缩略图，并且生成尺寸由该值决定，默认`400px`,传入`number`类型) */
    thumbMaxSize?: number;
    /** 监听视口选择器 (用于设定监听视口，用于图片懒加载) */
    viewportSelector?: string;
    /** 监听视口的Margin */
    viewRootMargin?: IntersectionObserverInit["rootMargin"];
    /** 是否只监听一次 (默认：true) */
    observerOnce?: boolean;
    /** 手动控制 (图片加载成功后是否手动控制图片的显示，如果为true则在@loaded的回调函数中会携带show方法供外部调用) */
    manualControl?: boolean;
    draggable?: boolean; // 是否允许拖拽图片
    initShow?: boolean;
  }>(),
  {
    src: "",
    initWidth: 0,
    initHeight: 0,
    useThumb: false,
    thumb: "",
    thumbMaxSize: 400,
    viewportSelector: "",
    viewRootMargin: "0%",
    observerOnce: true,
    manualControl: false,
    draggable: true, // 默认允许拖拽图片
    initShow: false,
  }
);

// ? 定义emits
const emits = defineEmits<{
  loaded: [info: ImgReadyInfo];
  ready: [info: ImgReadyInfo];
  mounted: [];
  error: [];
}>();

// ? 用户传入的属性
const attrs = useAttrs();

// ? 用户传入的插槽
const slots = useSlots();

// s 组件挂载标识符
const mounted = ref(false);

// s 组件挂载时执行
onMounted(async () => {
  // 触发emit:mounted
  emits("mounted");
  await nextTick();
  mounted.value = true;
});

// ? 组件容器Ref
const container = useTemplateRef("container");

// j 计算属性：监听容器的dom
const viewportDom = computed<IntersectionObserverInit["root"]>(() => {
  if (props.viewportSelector.trim()) {
    return document.querySelector(props.viewportSelector);
  } else {
    return null;
  }
});

// ? 监听src的变化
watch(
  () => props.src,
  (newSrc, _oldSrc) => {
    // ? src发生变化时重新调用图片加载函数
    if (!slots?.default) loadImage(newSrc);
  }
);

// s 组件状态信息
const state = reactive({
  errorImg: errorImg,
  width: props.initWidth,
  height: props.initHeight,
  isError: ref(false),
  loaded: ref(props.initShow),
  show: ref(props.initShow),
});

// ? imgWrap的Ref
const imgWrapRef = useTemplateRef("imgWrapRef");

// s imgWarp尺寸数据
const imgWrapDimensions = ref({ width: 0, height: 0 }); // ⬅️ 新的响应式依赖

// ? 监听器
let observer: ResizeObserver | null = null;

// ? 组件挂载时对imgWrap进行监听
onMounted(() => {
  if (imgWrapRef.value) {
    // 实例化 ResizeObserver
    observer = new ResizeObserver((entries) => {
      // 每次尺寸变化时，更新响应式数据
      const rect = entries[0].contentRect;
      imgWrapDimensions.value = {
        width: rect.width,
        height: rect.height,
      };
    });
    observer.observe(imgWrapRef.value);
  }
});

// ? 当组件卸载时取消监听
onUnmounted(() => {
  observer?.disconnect();
});

// j 计算属性: imgWarp 最小尺寸
const minWarpSize = computed(() => {
  const { width, height } = imgWrapDimensions.value;
  // console.log(width, height);
  // 当 wrapDimensions 变化时，这里会自动重新计算
  return Math.min(width, height);
});

// j 计算属性: 圆形进度条的宽度动态值
const circleLoadingWidth = computed(() => {
  // const { width, height } = imgWrapDimensions.value;
  const minSize = minWarpSize.value;
  if (minSize <= 16) {
    return minSize * 0.15;
  } else if (minSize <= 32) {
    return minSize * 0.1;
  } else if (minSize <= 64) {
    return minSize * 0.07;
  } else if (minSize <= 128) {
    return minSize * 0.04;
  } else if (minSize <= 256) {
    return minSize * 0.03;
  } else if (minSize <= 512) {
    return minSize * 0.02;
  } else {
    return minSize * 0.015;
  }
});

// j 计算属性: 圆形进度条的尺寸
const circleLoadingSize = computed(() => {
  // const { width, height } = imgWrapDimensions.value;
  const minSize = minWarpSize.value;
  if (minSize <= 16) {
    return minSize * 0.6;
  } else if (minSize <= 32) {
    return minSize * 0.4;
  } else if (minSize <= 64) {
    return minSize * 0.4;
  } else if (minSize <= 128) {
    return minSize * 0.35;
  } else if (minSize <= 256) {
    return minSize * 0.25;
  } else {
    return minSize * 0.2;
  }
});

// ? img标签的Ref
const imgRef = useTemplateRef("imgRef");

// ? 图片准备成功后的信息
export type ImgReadyInfo = {
  meta: {
    valid: boolean;
    width: number;
    height: number;
    aspectRatio: number;
    [key: string]: any;
  };
  dom?: HTMLImageElement | null;
  load?: Function;
};

// f 加载图片
const loadImage = async (src: string, thumb: string = "") => {
  const img = new Image();
  // img.referrerPolicy = "strict-origin-when-cross-origin";
  // img.referrerPolicy = "no-referrer";
  img.referrerPolicy = "no-referrer-when-downgrade";

  // ? 定义：图片显示函数
  const handleShow = () => {
    if (imgRef.value) {
      imgRef.value.src = thumb != "" ? thumb : src;
      nextTick(() => {
        imgRef.value!.style.display = "block";
      });
    }
    state.loaded = true;
    state.show = true;
    state.isError = false;
  };

  // ? 将图片赋值给img对象(开始加载)
  img.src = src;
  if (img.complete) {
    // * 当图片已经加载过

    state.width = img.naturalWidth;
    state.height = img.naturalHeight;

    let info: ImgReadyInfo = {
      meta: {
        valid: true,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight, // 宽高比.
      },
      dom: imgRef.value,
    };

    // ? 判断是否需要用户手动加载
    if (!props.manualControl) {
      // ? 如果用户不需要手动加载就立即加载
      handleShow();
      emits("loaded", info);
      return;
    }

    // ? 用户需要手动加载则在 info 上添加 load 方法
    info.load = handleShow;
    emits("loaded", info);
  } else {
    // * 首次加载图片

    img.addEventListener(
      "load",
      () => {
        // * 当图片加载成功时

        // 记录图片的宽高信息
        state.width = img.naturalWidth;
        state.height = img.naturalHeight;

        let { loaded, isError, show, ...infoRest } = state;

        // 对剩余的属性进行类型标注
        let info: ImgReadyInfo = {
          meta: {
            valid: true,
            ...infoRest,
            aspectRatio: infoRest.width / infoRest.height,
          },
          dom: imgRef.value,
        };

        // ? 判断是否需要用户手动加载
        if (!props.manualControl) {
          // ? 如果用户不需要手动加载就立即加载
          handleShow();
          // 触发loaded事件
          emits("loaded", info);
          return;
        }

        // ? 用户需要手动加载则在 info 上添加 load 方法
        info.load = handleShow;
        emits("loaded", info);
      },
      { once: true }
    );

    img.addEventListener(
      "error",
      () => {
        // * 当图片加载错误时
        console.log("图片加载错误", src);
        state.isError = true;
        state.loaded = true;
        // 将图片替换为
        imgRef.value!.src = state.errorImg;
        emits("error");
      },
      { once: true }
    );
  }
};

// f 异步生成缩略图并返回结果
async function generateThumbnail(
  source: File | string,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = "anonymous"; // 必须在设置 src 之前

    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      let width = img.width;
      let height = img.height;

      if (width < maxWidth && height < maxHeight) {
        // ? 如果img尺寸小于 maxWidth 和 maxHeight 则直接返回原本的 source
        resolve(source as string);
      }

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      let thumbnail = "";
      try {
        thumbnail = canvas.toDataURL("image/jpeg");
        // ? 成功后返回成功生成的base64字符串
        resolve(thumbnail);
      } catch {
        // ? 如果失败则返回直接返回传入的source
        resolve(source as string);
      }
    };
    img.onerror = function (error) {
      reject(error);
    };

    if (typeof source === "string") {
      // ? 如果 source 是 URL，则直接设置图片的 src
      img.src = source;
    } else if (source instanceof File) {
      // ? 如果是 File 对象则先读取文件再设置图片的 src
      const reader = new FileReader();
      reader.onload = function (event) {
        // 防止event.target为null
        if (!event.target || !event.target.result) {
          // ? 如果失败则返回直接返回传入的source
          resolve(source as any);
          return;
        }
        img.src = event.target.result as string;
      };
      reader.onerror = function () {
        // ? 如果失败则返回直接返回传入的source
        resolve(source as any);
      };
      reader.readAsDataURL(source);
    } else {
      // ? 如果类型错误直接返回传入的source
      resolve(source);
    }
  });
}

// ? 自定义指令
const vLazy: Directive = {
  mounted: async () => {

    await nextTick();
    // ! 将任务放入宏队列(防止有些时候交叉检测失败的bug)
    setTimeout(() => {
      let src: string = props.src; // 默认使用原图

      if (!!slots.default||!src) {
        // ? 用户向默认传入内容，则直接完成加载逻辑
        state.loaded = true;
        state.show = true;
        state.isError = !src;
        // ? 触发loaded事件,同时返回 info 对象
        emits("loaded", {
          meta: {
            aspectRatio: 0,
            height: 0,
            width: 0,
            valid: true,
            imgDom: imgRef.value,
          },
        });
        return;
      }

      const handleIntersection = async (
        entries: IntersectionObserverEntry[]
      ) => {
        // console.log(entries[0].isIntersecting);
        if (entries[0]!.isIntersecting) {
          // ? 判断是否只监听一次
          if (props.observerOnce) {
            // 停止监听
            observer.disconnect();
          }
          // 判断是否已经被加载过了
          if (state.loaded) {
            // 如果已经被加载就让其显示
            state.show = true;
            return;
          }

          let thumb = props.thumb;
          // 这里判断是否使用缩略图
          if (props.useThumb) {
            // s 使用缩略图
            if (thumb) {
              // console.log("存在缩略图", thumb);
              // 如果缩略图存在,就使用缩略图
              src = thumb;
            } else {
              try {
                // 如果没有缩略图,就使用原图生成
                const res = await generateThumbnail(
                  props.src,
                  props.thumbMaxSize,
                  props.thumbMaxSize
                );
                if (res) {
                  thumb = res;
                }
              } catch {
                thumb = props.thumb;
              }
            }
          }
          // 执行加载函数
          loadImage(src, thumb);
        } else {
          state.show = false; // 标记为不可见
        }
      };

      // 创建 IntersectionObserver
      const options: IntersectionObserverInit = {
        root: viewportDom.value,
        rootMargin: props.viewRootMargin,
      };
      // console.log(viewportDom.value);
      const observer = new IntersectionObserver(handleIntersection, options);
      // 开始监听
      if (container.value) {
        observer.observe(container.value);
      } else {
        console.log("图片监听失效,可能未找到imgContainer");
      }
    });
  },
};
</script>

<style lang="scss" scoped>
.img__container {
  /* position: relative; */
  box-sizing: border-box; // 盒子模型，确保边框不会影响内容的大小。
  * {
    box-sizing: border-box;
  }
  display: flex;
  flex-flow: column;
  width: fit-content;
}

.img__wrap {
  display: flex;
  align-items: center;

  /** 默认不显示 */
  opacity: 0;
  visibility: hidden;
  /* transform: scale(0.1); */
  transition: opacity 0s ease-out, visibility 0s linear 0s;

  /* transition: opacity 0.25s ease-out, visibility 0s linear 0.25s; */
}

// 加载中的样式
.img__wrap.loading {
  opacity: 0;
  visibility: hidden;
}

// 加载完成且可见的样式
.img__wrap.show {
  opacity: 1;
  visibility: visible;
  /* transform: scale(1); */
  /* transition: opacity 0.25s ease-in, visibility 0s linear 0s; */
  transition: opacity 0.25s ease-in, visibility 0s linear 0s;
}
// 加载错误的样式
.img__wrap.error {
  transform: scale(0.8);
  /* visibility: visible; */
  opacity: 0.5;
  object-fit: contain;
}

img {
  display: block;
  &:not([width]) {
    width: 100%;
  }
  &:not([height]) {
    height: auto;
  }

  padding: 0;
  object-fit: contain;
  background: transparent;
  /* 禁止选中文字 */
  user-select: none;
  /* 禁止图文拖拽 */
  -webkit-user-drag: none;
}

/* 图片加载动画 */
.img__wrap.loading::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: calc(v-bind(circleLoadingSize) * 1px);
  aspect-ratio: 1;

  $border-width: calc(v-bind(circleLoadingWidth) * 1px);

  border: $border-width solid #ccc;

  border-radius: 50%;
  border-top-color: #007bff;
  animation: spin 0.5s linear infinite; /* 旋转动画 */
  z-index: 100;
}
/* 图片加载动画定义 */
@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
