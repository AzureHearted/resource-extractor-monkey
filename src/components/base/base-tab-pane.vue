<template>
	<div class="base-tab-pane__container">
		<slot></slot>
		<!-- 仅用于IDE的智能提示(不显示) -->
		<template v-if="false">
			<slot name="tab"></slot>
		</template>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		name: string;
		title?: string;
		disable?: boolean;
	}>(),
	{}
);
</script>

<style lang="scss" scoped>
.base-tab-pane__container {
	flex: 1;
}
</style>
