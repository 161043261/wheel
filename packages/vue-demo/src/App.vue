<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import ChildOne from "./components/ChildOne.vue";
import ChildTwo from "./components/ChildTwo.vue";
import { emitter } from "./utils/bus";
import { ohMyMitt } from "@wheel/oh-my-mitt";

onBeforeUnmount(() => {
  emitter.all.clear();
  ohMyMitt.clear();
});
</script>

<template>
  <ChildOne />
  <ChildTwo />
</template>

<style scoped></style>
