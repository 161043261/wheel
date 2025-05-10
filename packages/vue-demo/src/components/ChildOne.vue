<script setup lang="ts">
import { emitter } from "../utils/bus";

const handleClick = () => {
  emitter.emit("eventName", {
    componentName: "ChildOne",
    message: "ping",
  });
};
</script>

<template>
  <div>
    ChildOne

    <button @click="handleClick">publish</button>
  </div>
</template>

<style lang="css"></style>
