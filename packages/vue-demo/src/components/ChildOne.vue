<script setup lang="ts">
import { emitter } from "../utils/bus";
import { ohMyMitt } from "@wheel/oh-my-mitt";

const handleClick = () => {
  emitter.emit("eventName", {
    name: "mitt",
    message: "ping",
  });

  ohMyMitt.emit("eventName", {
    name: "oh-my-mitt",
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
