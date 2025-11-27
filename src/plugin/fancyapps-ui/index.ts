// 导入Fancybox和CSS文件
import { Fancybox as _Fancybox } from "@fancyapps/ui";
import type { FancyboxOptions } from "@fancyapps/ui/dist/fancybox/fancybox.d.ts";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

import l10n from "./l10n"; //导入汉化配置
import Carousel from "./carousel"; // 导航配置

export const configFancybox: Partial<FancyboxOptions> = {
  l10n,
  Carousel,
  zoomEffect: true,
  Hash: false,
  theme: "auto",
  modal: false,
  // hideScrollbar: true,
};

export const Fancybox = _Fancybox;
