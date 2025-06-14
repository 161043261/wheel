<script setup lang="ts">
import { createStore } from "@wheel/oh-my-zustand";
import { ref } from "vue";

export interface ICntState {
  cnt: number;
}

const useCntStore = createStore<ICntState>((/** set */) => {
  return {
    cnt: 0,
  };
});

const { getState, setState, subscribe } = useCntStore;
const cnt = ref(getState().cnt);

const addCnt = () => {
  setState((state: ICntState) => ({ cnt: state.cnt + 1 }));
};

const asyncSubCnt = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      setState((state: ICntState) => ({ cnt: state.cnt - 1 }));
      resolve(null);
    }, 1000);
  });
};

const resetCnt = () => {
  setState({ cnt: 0 });
};

subscribe(() => {
  cnt.value = getState().cnt;
});
</script>

<template>
  <div>
    cnt: {{ cnt }}
    <button @click="addCnt">addCnt</button>
    <button @click="asyncSubCnt">asyncSubCnt</button>
    <button @click="resetCnt">resetCnt</button>
  </div>
</template>

<style scoped lang="css"></style>
