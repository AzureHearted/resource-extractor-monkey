import { computed, ref } from "vue";
import { defineStore } from "pinia";

export default defineStore("LoadingStore", () => {
  const loading = ref(false);
  const total = ref(1);
  const current = ref(0);
  const percentage = computed(() => {
    if (total.value <= 0) return 0;
    if (current.value >= total.value) {
      return 100;
    }
    return (current.value / total.value) * 100;
  });

  // f 开始
  function start(_total: number = 1) {
    current.value = 0;
    total.value = _total;
    loading.value = true;
  }

  // f 更新
  function update(_current: number, _total?: number) {
    current.value = _current;
    if (_total) {
      total.value = _total;
    }
  }

  // f 更新(百分比)
  function updatePercent(percent: number, _total?: number) {
    if (_total) {
      total.value = _total;
    }
    current.value = percent * total.value;
  }

  // f 停止
  function end() {
    loading.value = false;
    current.value = total.value;
    // setTimeout(() => {
    // 	nextTick(() => {
    // 		current.value = 0;
    // 	});
    // }, 500);
  }

  return {
    loading,
    current,
    total,
    percentage,
    start,
    update,
    updatePercent,
    end,
  };
});
