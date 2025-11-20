<template>
	<div
		ref="containerDOM"
		class="video__container"
		:data-width="state.width"
		:data-height="state.height"
		:class="{ loading: !state.loaded && show }">
		<!-- 视频主体 -->
		<div
			class="video__wrap"
			:class="{
				loading: !state.loaded && show,
				show: state.show && show,
				error: state.isError,
			}"
			:style="{ aspectRatio: aspectRatio }">
			<slot>
				<template v-if="mounted">
					<!-- s 不使用用缩略图 -->
					<template v-if="!useThumb">
						<!-- s 正常视频元素 -->
						<video
							v-if="!state.isError"
							ref="videoDom"
							v-lazy.src="src"
							:controls="showControls"
							:loop="loop"
							:muted="muted"
							:autoplay="autoplay && !hoverPlay"
							controlslist="nofullscreen noremoteplayback"
							disablepictureinpicture
							:draggable="draggable" />
						<!-- s 加载错误时的显示元素 -->
						<BaseImg v-else :src="errorImg" />
					</template>
					<!-- s 使用用缩略图 -->
					<template v-else>
						<BaseImg :src="thumb" />
					</template>
				</template>
			</slot>
			<div v-if="!state.isError" class="play-icon">
				<i-material-symbols-play-circle />
			</div>
		</div>
		<!-- 其他内容(插槽) -->
		<slot name="other"></slot>
	</div>
</template>

<script setup lang="ts">
	// 导入工具函数
	import { onMounted } from "vue";
	import {
		ref,
		reactive,
		computed,
		onUnmounted,
		defineProps,
		withDefaults,
		defineEmits,
		watch,
		nextTick,
		onActivated,
	} from "vue";
	import type { Directive } from "vue";
	import BaseImg from "./base-img.vue";
	import { useElementHover } from "@vueuse/core";

	// 加载错误时的图片
	const errorImg =
		"data:image/png;base64,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ABAgQCBQSAwKYrmQABAgQICAD2AAECBAgQCBQQAAKbrmQCBAgQICAA2AMECBAgQCBQQAAIbLqSCRAgQICAAGAPECBAgACBQAEBILDpSiZAgAABAgKAPUCAAAECBAIFBIDApiuZAAECBAgIAPYAAQIECBAIFBAAApuuZAIECBAgIADYAwQIECBAIFBAAAhsupIJECBAgIAAYA8QIECAAIFAAQEgsOlKJkCAAAECAoA9QIAAAQIEAgUEgMCmK5kAAQIECAgA9gABAgQIEAgUEAACm65kAgQIECAgANgDBAgQIEAgUEAACGy6kgkQIECAgABgDxAgQIAAgUABASCw6UomQIAAAQICgD1AgAABAgQCBQSAwKYrmQABAgQICAD2AAECBAgQCBQQAAKbrmQCBAgQICAA2AMECBAgQCBQQAAIbLqSCRAgQICAAGAPECBAgACBQAEBILDpSiZAgAABAgKAPUCAAAECBAIFBIDApiuZAAECBAgIAPYAAQIECBAIFBAAApuuZAIECBAgIADYAwQIECBAIFBAAAhsupIJECBAgIAAYA8QIECAAIFAAQEgsOlKJkCAAAECAoA9QIAAAQIEAgUEgMCmK5kAAQIECAgA9gABAgQIEAgUEAACm65kAgQIECAgANgDBAgQIEAgUEAACGy6kgkQIECAgABgDxAgQIAAgUABASCw6UomQIAAAQICgD1AgAABAgQCBQSAwKYrmQABAgQICAD2AAECBAgQCBQQAAKbrmQCBAgQIPD/Ae7y8T273M70AAAAAElFTkSuQmCC";
	// 定义props
	const props = withDefaults(
		defineProps<{
			src: string;
			initWidth?: number;
			initHeight?: number;
			useThumb?: boolean;
			thumb?: string;
			viewportSelector?: string;
			viewRootMargin?: IntersectionObserverInit["rootMargin"];
			observerOnce?: boolean;
			manualControl?: boolean;
			draggable?: boolean; // 是否允许拖拽
			initShow?: boolean;
			show?: boolean; //是否显示
			muted?: boolean; //是否静音
			loop?: boolean; //是否循环播放
			autoplay?: boolean; //自动播放
			showControls?: boolean; //是否显示视频控制栏
			hoverPlay?: boolean; // 是否悬浮播放(与autoplay不兼容,如果为true会忽视autoplay)
			hoverAnewStart?: boolean; // 是否在悬浮时从头播放
		}>(),
		{
			src: "",
			initWidth: 0,
			initHeight: 0,
			useThumb: false,
			thumb: "",
			viewportSelector: "",
			viewRootMargin: "0%",
			observerOnce: true,
			manualControl: false,
			draggable: true, // 默认允许拖拽
			initShow: false,
			show: true,
			muted: false, // 默认不静音
			loop: false, // 默认不循环播放
			autoplay: false, // 默认不自动播放
			showControls: true, // 默认显示控制栏
			hoverPlay: false, // 默认不悬浮播放
			hoverAnewStart: false, // 默认悬浮时不从头播放
		}
	);

	// s 挂载标识符
	const mounted = ref(false);
	onMounted(() => {
		// console.log("视频组件挂载");
		nextTick(() => {
			mounted.value = true;
		});
	});

	onActivated(() => {
		nextTick(() => {
			mounted.value = true;
			// loadVideo(props.src);
		});
	});

	onUnmounted(() => {
		// console.log("视频组件卸载");
		mounted.value = false;
	});

	// s 组件容器DOM
	const containerDOM = ref<HTMLElement | null>(null);

	// j 视口容器DOM
	const viewportDom = computed<IntersectionObserverInit["root"]>(() => {
		if (props.viewportSelector.trim()) {
			return document.querySelector(props.viewportSelector);
		} else {
			return null;
		}
	});

	// w 监听传入的src变化,变化时立即重新加载
	watch(
		() => props.src,
		(newSrc) => {
			// console.log("src变化", newSrc, oldSrc);
			if (mounted.value) {
				loadVideo(newSrc);
			}
		}
	);

	// w 监听外部传入的是否显示变量(如果不显示的时候就暂停)
	watch(
		() => props.show,
		(show) => {
			if (!videoDom.value || props.hoverPlay) return;
			if (show) {
				videoDom.value.play();
			} else {
				videoDom.value.pause();
			}
		}
	);

	// s 组件是否被鼠标悬浮
	const isHover = useElementHover(containerDOM);

	// s 监听组件悬浮状态变化
	watch(
		() => isHover.value,
		(nowIsHover) => {
			// console.log("悬浮状态变化");
			if (!videoDom.value) return;
			if (nowIsHover) {
				if (props.hoverAnewStart) {
					videoDom.value.currentTime = 0;
					videoDom.value.play();
				} else {
					videoDom.value.play();
				}
			} else {
				videoDom.value.pause();
				if (props.hoverAnewStart) {
					videoDom.value.currentTime = 0;
				}
			}
		}
	);

	// 定义状态
	const state = reactive({
		errorImg: errorImg,
		width: props.initWidth,
		height: props.initHeight,
		isError: ref(false),
		loaded: ref(props.initShow),
		show: ref(props.initShow),
	});

	// 定义宽高比
	const aspectRatio = computed(() => {
		if (state.isError) {
			return props.initWidth && props.initHeight
				? props.initWidth / props.initHeight
				: 16 / 9;
		} else {
			return state.width && state.height ? state.width / state.height : 16 / 9;
		}
	});

	// 定义video标签的ref
	const videoDom = ref<HTMLVideoElement | null>(null);

	export type returnInfo = {
		meta: {
			valid: boolean;
			width: number;
			height: number;
			aspectRatio: number; // 宽高比
			[key: string]: any;
		};
		dom?: HTMLImageElement;
		load?: Function;
	};

	// 定义事件
	const emit = defineEmits<{
		(e: "loaded", info: returnInfo): void;
		(e: "error"): void;
	}>();

	// f 获取视频宽高
	function getVideoSize(
		url: string
	): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.onloadedmetadata = function () {
				// 获取视频宽度和高度
				const width = video.videoWidth;
				const height = video.videoHeight;
				// 释放资源
				URL.revokeObjectURL(video.src);
				resolve({ width, height });
			};
			video.onerror = function () {
				reject("无法加载视频");
			};

			video.src = url;
			video.load();
		});
	}

	// f 加载
	const loadVideo = async (src: string) => {
		// f 视频加载函数
		const handleLoad = () => {
			if (videoDom.value) {
				videoDom.value.src = src;
				nextTick(() => {
					videoDom.value!.style.display = "block";
				});
			}
			state.loaded = true;
			state.show = true;
			state.isError = false;
		};
		// 获取视频尺寸信息
		getVideoSize(src)
			.then(({ width, height }) => {
				// 记录宽高信息
				state.width = width;
				state.height = height;

				// 对剩余的属性进行类型标注
				let info: returnInfo = {
					meta: {
						valid: true,
						...state,
						aspectRatio: width / height, // 宽高比.
					},
				};

				// 判断是否需要用户手动加载
				if (!props.manualControl) {
					// 如果用户不需要手动加载就立即加载
					handleLoad();
					// 触发loaded事件
					emit("loaded", info);
					return;
				}

				// 返回dom和load函数
				info.load = handleLoad; // 如果需要手动加载就将该方法返回
				// 触发loaded事件,同时返回info对象
				emit("loaded", info);
			})
			.catch(() => {
				console.log("视频加载错误", src);
				state.isError = true;
				state.loaded = true;
				// 触发error事件
				emit("error");
			});
	};

	// 自定义指令
	const vLazy: Directive = {
		mounted: () => {
			// 将任务放入宏队列(防止有些时候交叉检测失败的bug)
			setTimeout(() => {
				let src: string = props.src; // 默认使用传入src
				const handleIntersection = async (
					entries: IntersectionObserverEntry[]
				) => {
					// console.log(entries[0].isIntersecting);
					if (entries[0].isIntersecting) {
						// 判断是否只监听一次
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

						// 执行加载函数
						loadVideo(src);
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
				if (containerDOM.value) {
					observer.observe(containerDOM.value);
				} else {
					console.log("监听失效,可能未找到containerDOM");
				}
			});
		},
	};
</script>

<style lang="scss" scoped>
	.video__container {
		position: relative;
		box-sizing: border-box; // 盒子模型，确保边框不会影响内容的大小。
		// background: rgba(0, 0, 0, 0.5);
		background: transparent;
		* {
			box-sizing: border-box;
		}
	}
	.video__wrap {
		opacity: 0; //默认不显示
		transition: 0.5s ease-out; // 添加过渡效果
	}
	// 加载中的样式
	.video__wrap.loading {
		opacity: 0;
	}
	// 加载完成且可见的样式
	.video__wrap.show {
		opacity: 1;
	}
	// 加载错误的样式
	.video__wrap.error {
		transform: scale(0.8);
		opacity: 0.5;
		object-fit: contain;
	}

	video {
		display: block;
		width: 100%;
		height: auto;
		padding: 0;
		object-fit: cover;
		background: transparent;
		/* 禁止选中文字 */
		user-select: none;
		/* 禁止图文拖拽 */
		-webkit-user-drag: none;
		transition: 0.5s ease-out; // 添加过渡效果
	}

	/* 加载动画 */
	.video__container.loading::before {
		content: "";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 30%;
		// height: 50%;
		aspect-ratio: 1;
		max-width: 80%;
		max-height: 80%;
		border: 5px solid #ccc;
		border-radius: 50%;
		border-top-color: #007bff;
		animation: spin 1s linear infinite; /* 旋转动画 */
		z-index: 100;
	}
	/* 加载动画定义 */
	@keyframes spin {
		0% {
			transform: translate(-50%, -50%) rotate(0deg);
		}
		100% {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}
	// s 播放按钮
	.play-icon {
		position: absolute;
		display: flex;
		pointer-events: none;
		inset: 0;
		opacity: 0.8;
		background-repeat: no-repeat;

		transition: 0.5s ease;
		& > svg {
			width: 100%;
			height: 100%;
			aspect-ratio: 1;
			color: palevioletred;
			transform: scale(0.5);
			backdrop-filter: blur(10px);

			filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.5));
		}
	}

	.video__container:hover .play-icon {
		opacity: 0;
	}
</style>
