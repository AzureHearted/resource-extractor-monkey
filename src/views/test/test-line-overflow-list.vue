<template>
  <n-flex :size="4" vertical>
			<n-flex :size="4">
				<n-button type="primary" @click="addTag">添加标签</n-button>
				<n-button type="warning" @click="tags.splice(0)">清空</n-button>
			</n-flex>
			<BaseLineOverflowList
				:list="tags"
				:wrap-style="{
					width: '50%',
				}">
				<template #default="{ item, index }">
					<var-chip
						:key="item.id"
						size="mini"
						type="primary"
						@close="tags.splice(index, 1)">
						<template #default> ({{ index }}) - {{ item.label }} </template>
					</var-chip>
				</template>
			</BaseLineOverflowList>
		</n-flex>
</template>

<script setup lang="ts">
	import BaseLineOverflowList from "@/components/base/base-line-overflow-list.vue";
	import { ref, reactive, onMounted } from "vue";

	interface Tag {
		label: string;
		id: string;
	}
	const tags = ref<Tag[]>(
		[...Array(6).keys()].map(() => {
			return {
				label: `标签${(Math.random() * 100).toFixed(0)}`,
				id: crypto.randomUUID(),
			};
		})
	);

	const addTag = () => {
		tags.value.push({
			label: `标签${(Math.random() * 100).toFixed(0)}`,
			id: crypto.randomUUID(),
		});
	};
</script>

<style scoped>

</style>