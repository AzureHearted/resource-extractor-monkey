import type { FancyboxOptions } from "@fancyapps/ui";
import Toolbar from "./toolbar";
// import on from "./event"; // 事件配置

export default {
  transition: "tween",
  Toolbar,
  Thumbs: {
    type: "modern",
    showOnStart: false,
  },
  Video: {
    html5videoTpl: /*html*/ `
      <video class="fancybox__html5video" playsinline  controls  poster="{{poster}}" draggable="false"><source src="{{src}}" type="{{format}}" />抱歉，您的浏览器不支持嵌入式视频.</video>
    `,
    autoplay: true,
  },
  Zoomable: {
    Panzoom: {
      minScale: 1,
      maxScale: 10,
    },
  },
} as FancyboxOptions["Carousel"];
