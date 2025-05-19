// 这是编译前的 .vue 文件 //
<script lang="js">
//   console.log("I'm App.vue, my content is compiled pure JS");
//
</script>

// 这是编译后的 .vue 文件 // 即使后缀名还是 .vue, 内容已经是纯 JS 了! // vite
开发服务器会设置 http 响应头 Content-Type=text/javascript // 告诉浏览器, 即使是
.vue 文件, 也请使用 JS 的方式解析 console.log("I'm App.vue, my content has
compiled to pure JS"); const button = document.createElement("button");
button.innerText = "Click me"; button.onclick = () => { alert("Hello Vite"); };
document.body.appendChild(button);
