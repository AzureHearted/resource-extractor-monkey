<template>
	<n-flex class="test__container" vertical :size="4">
		<!-- s Dock组件 -->
		<BaseDock v-model:show="show">
			<n-flex
				v-if="showBtn"
				:size="4"
				:wrap="false"
				style="box-sizing: border-box"
			>
				<n-button type="primary" size="medium">按钮1</n-button>
				<n-button type="primary" size="medium">按钮1</n-button>
				<n-button type="primary" size="medium">按钮1</n-button>
			</n-flex>
			<!-- <n-button type="primary" size="medium">测试</n-button> -->
		</BaseDock>
		<n-flex :size="4">
			<n-switch v-model:value="show" />
			<n-button type="primary" @click="showBtn = !showBtn">增加按钮</n-button>
			<n-button @click="saveAsPdf"> 保存页面 </n-button>
		</n-flex>
		<!-- s 单行溢出列表 -->
		<TestLineOverflowList />
	</n-flex>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TestLineOverflowList from "./test-line-overflow-list.vue";
import BaseDock from "@/components/base/base-dock.vue";
import html2pdf from "html2pdf.js";
import { legalizationPathString } from "@/utils/common";
// import { useGlobalStore } from "@/stores";

const show = ref(false);
const showBtn = ref(false);

// const globalStore = useGlobalStore();

async function saveAsPdf() {
	// globalStore.openWindow = false;
	const element = document.querySelector("body>.wrap-fullwidth");
	// console.log("准备保存：", element);
	setTimeout(async () => {
		if (element == null) return;
		const worker = html2pdf().set({
			margin: 0,
			enableLinks: true,
			image: {
				type: "webp",
			},
			html2canvas: {
				scale: 2,
				useCORS: true,
			},

			jsPDF: {
				orientation: "landscape",
			},
		});
		await worker
			.from(element as HTMLElement)
			.save(legalizationPathString(document.title));
		// globalStore.openWindow = true;
	}, 0);
}
</script>

<style lang="scss" scoped>
.test__container {
	position: relative;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	padding: 4px;
	// overflow: hidden;
}
</style>
