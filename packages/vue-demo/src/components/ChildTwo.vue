<script setup lang="ts">
import { ohMyMitt } from "@wheel/oh-my-mitt";
import { emitter } from "../utils/bus";
import { onBeforeUnmount } from "vue";

const handler = (data: unknown) => console.log(data);

emitter.on("eventName", handler);
ohMyMitt.on("eventName", handler);

onBeforeUnmount(() => {
  emitter.off("eventName", handler);
  ohMyMitt.off("eventName", handler);
});
</script>

<template>
  <div>ChildTwo</div>
</template>

<style lang="css"></style>
