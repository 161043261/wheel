<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import ChildOne from "./components/ChildOne.vue";
import ChildTwo from "./components/ChildTwo.vue";
import { emitter } from "./utils/bus";

onBeforeUnmount(() => {
  emitter.all.clear();
});
</script>

<template>
  <ChildOne />
  <ChildTwo />
</template>

<style scoped></style>
