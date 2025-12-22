<template>
	<n-flex style="width: 100%; flex: 1" :size="4">
		<BaseTabs style="width: 100%">
			<BaseTabPane label="图片" name="image">
				<template #tab>
					<n-flex :size="2" align="center">
						<n-icon>
							<icon-material-symbols-image />
						</n-icon>
						自定义-图片
					</n-flex>
				</template>
				<div v-for="i in 50" :key="i">图片{{ i }}</div>
			</BaseTabPane>
			<BaseTabPane label="视频" name="video1"> 视频1 </BaseTabPane>
			<BaseTabPane label="视频" name="video2"> 视频2 </BaseTabPane>
			<BaseTabPane label="视频" name="video3"> 视频3 </BaseTabPane>
			<BaseTabPane label="视频" name="video4"> 视频4 </BaseTabPane>
			<BaseTabPane label="视频" name="video5"> 视频5 </BaseTabPane>
			<BaseTabPane label="视频" name="video6"> 视频6 </BaseTabPane>
			<BaseTabPane label="视频" name="video7"> 视频7 </BaseTabPane>
			<BaseTabPane label="视频" name="video8"> 视频8 </BaseTabPane>
			<BaseTabPane label="视频" name="video9"> 视频9 </BaseTabPane>
		</BaseTabs>
	</n-flex>
</template>

<script setup lang="ts">
import BaseTabs from "@/components/base/base-tabs/base-tabs.vue";
import BaseTabPane from "@/components/base/base-tabs/base-tab-pane.vue";
</script>

<style lang="scss" scoped></style>
