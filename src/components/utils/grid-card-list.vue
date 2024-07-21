<template>
	<div class="grid__container">
		<div
			v-for="(item, index) in dataInfo.list"
			:key="item.id"
			class="grid__item">
			<slot :item="item" :index="index">
				<BaseCard
					:src="item.preview.url"
					:img-url="item.preview.url"
					img-object-fit="cover"
					:set-aspect-ratio="1"
					style="height: 100%" />
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
			objectFit?: CSSProperties["object-fit"];
		}>(),
		{
			data: () => [] as any[], // 默认值为空数组。
			keyProp: "id", // 默认值为"id"。
			itemPadding: "2px", // 默认值为
			itemBaseWidth: 220, // 默认值为220。
			disenableTransition: true, // 默认不禁用过渡
			loading: false, // 默认值为false。
			objectFit: "cover",
		}
	);

	// 数据信息
	const dataInfo = reactive({
		list: [] as Card[],
	});

	watch(
		() => props.data,
		(newList, oldList) => {
			dataInfo.list = newList;
		}
	);

	//s 判断组件是否被冻结
	const freeze = ref(false);

	//* 当组件被激活时执行
	onActivated(() => {
		// console.log("组件==>被激活");
		freeze.value = false;
		nextTick(() => {
			dataInfo.list = props.data;
		});
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
		// grid-template-columns: repeat(auto-fill, 200px);
		@media screen and (min-width: 0px) {
			grid-template-columns: repeat(1, 1fr);
		}
		@media screen and (min-width: 380px) {
			grid-template-columns: repeat(2, 1fr);
		}
		@media screen and (min-width: 720px) {
			grid-template-columns: repeat(3, 1fr);
		}
		@media screen and (min-width: 1100px) {
			grid-template-columns: repeat(4, 1fr);
		}
		@media screen and (min-width: 1280px) {
			grid-template-columns: repeat(5, 1fr);
		}
		grid-template-rows: 1fr;
		gap: 4px;
		padding: 4px;
	}
	.grid__item {
		position: relative;
		aspect-ratio: 1;
	}
	.grid__item :deep(.img__wrap img) {
		height: 100%;
	}
	// .grid__item :deep(.base-card__container),
	// .grid__item :deep(.base-card__container .img__wrap),
	// .grid__item :deep(.base-card__container .img__container) {
	// 	height: 100%;
	// }
	.grid__item :deep(.img__wrap) {
		aspect-ratio: 1 !important;
	}
</style>
