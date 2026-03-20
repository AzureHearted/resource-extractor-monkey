<template>
	<div class="base-checkbox__container" @click="checked = !checked">
		<n-button
			:type="checked ? 'success' : 'default'"
			:color="checked ? checkedColor : unCheckedColor"
			text
			block
		>
			<template #icon>
				<transition appear>
					<slot name="un-checked" v-if="!checked">
						<icon-material-symbols-check-box-outline-blank />
					</slot>
					<slot name="checked" v-else>
						<icon-material-symbols-check-box-rounded />
					</slot>
				</transition>
			</template>
		</n-button>
	</div>
</template>

<script setup lang="ts">
import { watch } from "vue";

withDefaults(
	defineProps<{
		checkedColor?: string;
		unCheckedColor?: string;
	}>(),
	{},
);

const emits = defineEmits<{
	(e: "change", val: boolean): void;
}>();

const checked = defineModel<boolean>("checked", { default: false });

watch(checked, (val) => {
	emits("change", val);
});
</script>

<style scoped lang="scss">
.base-checkbox__container {
	aspect-ratio: 1;
	height: 24px;
	display: flex;
}

// 进场过渡,退场过渡
.v-enter-from,
.v-leave-to {
	position: absolute;
	opacity: 0;
	// transform: scale(0);
}

// 进入的过程中
.v-enter-active {
	transition: 0.5s;
}
// 离开的过程中
.v-leave-active {
	transition: 0.5s;
}
</style>
