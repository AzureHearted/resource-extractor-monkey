<template>
	<div
		ref="containerDOM"
		class="img__container"
		:data-width="state.width"
		:data-height="state.height"
		:class="{ loading: !state.loaded && show }">
		<!-- 图片主体 -->
		<div
			class="img__wrap"
			:class="{
				loading: !state.loaded && show,
				show: state.show && show,
				error: state.isError,
			}"
			:style="{ aspectRatio: aspectRatio }">
			<slot>
				<img
					v-if="mounted"
					v-show="show"
					ref="imgDOM"
					v-lazy.src="src"
					:style="{ aspectRatio: aspectRatio }"
					:draggable="draggable" />
			</slot>
		</div>
		<!-- 其他内容(插槽) -->
		<slot name="other"></slot>
	</div>
</template>

<script setup lang="ts">
	// 导入工具函数
	import {
		ref,
		reactive,
		computed,
		onMounted,
		defineProps,
		withDefaults,
		defineEmits,
		watch,
		nextTick,
	} from "vue";
	import type { Directive } from "vue";
	// 导入加载错误时的图片
	const errorImg =
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTIgMmgyMHYxMGgtMlY0SDR2OS41ODZsNS01TDE0LjQxNCAxNEwxMyAxNS40MTRsLTQtNGwtNSA1VjIwaDh2Mkgyem0xMy41NDcgNWExIDEgMCAxIDAgMCAyYTEgMSAwIDAgMCAwLTJtLTMgMWEzIDMgMCAxIDEgNiAwYTMgMyAwIDAgMS02IDBtMy42MjUgNi43NTdMMTkgMTcuNTg2bDIuODI4LTIuODI5bDEuNDE1IDEuNDE1TDIwLjQxNCAxOWwyLjgyOSAyLjgyOGwtMS40MTUgMS40MTVMMTkgMjAuNDE0bC0yLjgyOCAyLjgyOWwtMS40MTUtMS40MTVMMTcuNTg2IDE5bC0yLjgyOS0yLjgyOHoiLz48L3N2Zz4=";
	// 定义props
	const props = withDefaults(
		defineProps<{
			src: string;
			initWidth?: number;
			initHeight?: number;
			useThumb?: boolean;
			thumb?: string;
			thumbMaxSize?: number;
			viewportSelector?: string;
			viewRootMargin?: IntersectionObserverInit["rootMargin"];
			observerOnce?: boolean;
			manualControl?: boolean;
			draggable?: boolean; // 是否允许拖拽图片
			initShow?: boolean;
			show?: boolean; //是否显示图片
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
			show: true,
		}
	);

	const mounted = ref(false);
	onMounted(() => {
		// console.log("图片组件挂载");
		nextTick(() => {
			mounted.value = true;
		});
	});

	//s 组件容器DOM
	const containerDOM = ref<HTMLElement | null>(null);
	//j 视口容器DOM
	const viewportDom = computed<IntersectionObserverInit["root"]>(() => {
		if (props.viewportSelector.trim()) {
			return document.querySelector(props.viewportSelector);
		} else {
			return null;
		}
	});

	//w 监听传入的src变化,变化时立即重新加载
	watch(
		() => props.src,
		(newSrc) => {
			// console.log("src变化", newSrc, oldSrc);
			if (mounted.value) {
				loadImage(newSrc);
			}
		}
	);

	//s 定义状态
	const state = reactive({
		errorImg: errorImg,
		width: props.initWidth,
		height: props.initHeight,
		isError: ref(false),
		loaded: ref(props.initShow),
		show: ref(props.initShow),
	});

	//j 宽高比
	const aspectRatio = computed(() => {
		if (state.isError) {
			return props.initWidth && props.initHeight
				? props.initWidth / props.initHeight
				: 1;
		} else {
			return state.width && state.height ? state.width / state.height : 1;
		}
	});

	//s 图片DOM
	const imgDOM = ref<HTMLImageElement | null>(null);

	//t 返回值类型定义
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

	//f 加载图片
	const loadImage = async (src: string) => {
		// console.log("src", src);
		const img = new Image();
		// img.referrerPolicy = "no-referrer-when-downgrade";
		// img.referrerPolicy = "no-referrer-when-downgrade";
		// 图片加载函数
		const handleLoad = () => {
			// console.log(imgDom.value);
			if (imgDOM.value) {
				imgDOM.value.src = src;
				nextTick(() => {
					imgDOM.value!.style.display = "block";
				});
			}
			state.loaded = true;
			state.show = true;
			state.isError = false;
		};

		// 将图片赋值给img对象(开始加载)
		img.src = src;
		if (img.complete) {
			// console.log("图片已经加载过了", img.naturalWidth, img.naturalHeight);

			state.width = img.naturalWidth;
			state.height = img.naturalHeight;

			let info: returnInfo = {
				meta: {
					valid: true,
					width: img.naturalWidth,
					height: img.naturalHeight,
					aspectRatio: img.naturalWidth / img.naturalHeight, // 宽高比.
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

			info.load = handleLoad;
			emit("loaded", info);
		} else {
			// console.log("首次加载图片");

			// f 当图片加载成功时
			img.addEventListener(
				"load",
				() => {
					// console.log("加载成功", dom);
					// console.log("图片首次加载成功！", src);
					// 记录图片的宽高信息
					state.width = img.naturalWidth;
					state.height = img.naturalHeight;

					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					let { loaded, isError, show, ...infoRest } = state;

					// 对剩余的属性进行类型标注
					let info: returnInfo = {
						meta: {
							valid: true,
							...infoRest,
							aspectRatio: infoRest.width / infoRest.height, // 宽高比.
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
					// info.dom = dom;
					info.load = handleLoad; // 如果需要手动加载就将该方法返回
					// 触发loaded事件,同时返回info对象
					emit("loaded", info);
				},
				{ once: true }
			);

			// f 当图片加载错误时
			img.addEventListener(
				"error",
				() => {
					console.log("图片加载错误", src);
					state.isError = true;
					state.loaded = true;
					imgDOM.value!.src = state.errorImg;
					// 触发error事件
					emit("error");
				},
				{ once: true }
			);
		}
	};

	// 异步生成缩略图并返回结果
	async function generateThumbnail(
		source: File | string,
		maxWidth: number,
		maxHeight: number
	): Promise<string | null> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = function () {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
				let width = img.width;
				let height = img.height;
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
				const thumbnail = canvas.toDataURL("image/jpeg");
				resolve(thumbnail);
			};
			img.onerror = function (error) {
				reject(error);
			};

			if (typeof source === "string") {
				img.src = source; // 如果 source 是 URL，则直接设置图片的 src
			} else if (source instanceof File) {
				const reader = new FileReader();
				reader.onload = function (event) {
					// 防止event.target为null
					if (!event.target || !event.target.result) {
						resolve(null);
						return;
					}
					// 如果 source 是文件对象，则先读取文件再设置图片的 src
					img.src = event.target.result as string;
				};
				reader.onerror = function () {
					resolve(null);
				};
				reader.readAsDataURL(source);
			} else {
				resolve(null);
			}
		});
	}

	// 自定义指令
	const vLazy: Directive = {
		mounted: () => {
			// console.log("图片挂载", el.src, el);
			// 将任务放入宏队列(防止有些时候交叉检测失败的bug)
			if (imgDOM.value) {
				imgDOM.value.src = ""; //s 先去除原先的src
			}
			setTimeout(() => {
				let src: string = props.src; // 默认使用原图
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

						// 这里判断是否使用缩略图
						if (props.useThumb) {
							// s 使用缩略图
							if (props.thumb) {
								// console.log("存在缩略图", props.thumb);
								// 如果缩略图存在,就使用缩略图
								src = props.thumb;
							} else {
								// 如果没有缩略图,就使用原图生成
								const res = await generateThumbnail(
									props.src,
									props.thumbMaxSize,
									props.thumbMaxSize
								);
								if (res) {
									src = res;
								}
							}
						}
						// 执行加载函数
						loadImage(src);
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
					console.log("图片监听失效,可能未找到imgContainer");
				}
			});
		},
	};
</script>

<style lang="scss" scoped>
	.img__container {
		position: relative;
		box-sizing: border-box; // 盒子模型，确保边框不会影响内容的大小。
		// background: rgba(0, 0, 0, 0.5);
		background: transparent;
		* {
			box-sizing: border-box;
		}
	}
	.img__wrap {
		opacity: 0; //默认不显示
		transition: 0.5s ease-out; // 添加过渡效果
	}
	// 加载中的样式
	.img__wrap.loading {
		opacity: 0;
	}
	// 加载完成且可见的样式
	.img__wrap.show {
		opacity: 1;
	}
	// 加载错误的样式
	.img__wrap.error {
		transform: scale(0.8);
		opacity: 0.5;
		object-fit: contain;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		padding: 0;
		background: transparent;
		/* 禁止选中文字 */
		user-select: none;
		/* 禁止图文拖拽 */
		-webkit-user-drag: none;
		transition: 0.5s ease-out; // 添加过渡效果
	}

	/* 图片加载动画 */
	.img__container.loading::before {
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
