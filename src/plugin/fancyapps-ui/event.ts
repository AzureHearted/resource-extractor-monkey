// import type { OptionsType } from "@fancyapps/ui/types/Fancybox/options";
// import type { slideType } from "@fancyapps/ui/types/Carousel/types";
// import type { Carousel } from "@fancyapps/ui/types/Carousel/Carousel";

import type { FancyboxOptions } from "@fancyapps/ui";

// 图片显示修复函数
// const fixShowSize = (slide: slideType) => {
// 	// console.log(slide);
// 	setTimeout(() => {
// 		const contentEl = slide.contentEl;
// 		const fancyBoxEl = slide.el;
// 		if (!contentEl || !fancyBoxEl) return;
// 		if (!contentEl.clientWidth || !contentEl.clientHeight) {
// 			// 如果contentEl元素意外有一个方向尺寸为0,则通过原始目标获取宽高比
// 			const target = slide.triggerEl;
// 			if (!target) return;
// 			const aspectRatio =
// 				Number(target.clientWidth) / Number(target.clientHeight);

// 			const width = fancyBoxEl.clientHeight * 0.9 * aspectRatio;
// 			const height = fancyBoxEl.clientHeight * 0.9;
// 			// console.log(width, height, aspectRatio);
// 			if (!slide.contentEl || !slide.panzoom) return;
// 			slide.contentEl.style.width = width + "px";
// 			slide.contentEl.style.height = height + "px";
// 			slide.panzoom.contentRect.fitWidth = width;
// 			slide.panzoom.contentRect.fitHeight = height;
// 			// console.log("done-->fixed", slide);
// 		}
// 	});
// };

export default {
  // 所有事件的回调(测试用)
  // "*": (_, type: string, ...args: any[]) => {
  // 	console.log(type, args);
  // },
  // Carousel进行slide创建时的回调
  // "Carousel.createSlide": (_, carousel: Carousel) => {
  // 	const slides = carousel.slides.filter((x) => x.contentEl);
  // 	// console.log("Carousel.createSlide", slides);
  // 	slides.forEach((slide) => {
  // 		fixShowSize(slide);
  // 	});
  // },
  // Carousel进行更新时的回调
  // "Carousel.refresh": (_, carousel: Carousel) => {
  // 	const slides = carousel.slides.filter((x) => x.contentEl);
  // 	// console.log("Carousel.refresh", slides);
  // 	slides.forEach((slide) => {
  // 		fixShowSize(slide);
  // 	});
  // },
  // done: (_, slide: slideType) => {
  // 	// console.log("done:", slide);
  // 	fixShowSize(slide);
  // },
} as FancyboxOptions["on"];
