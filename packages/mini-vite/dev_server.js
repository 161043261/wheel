import Koa from "koa";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
// console.log("__filename", __filename);
const __dirname = path.dirname(__filename);
console.log("__dirname", __dirname);

// 读取 vite.config.js
import viteConfig from "./vite.config.js";
console.log("viteConfig", viteConfig);
import resolveAlias from "./resolve_alias.js";

const app = new Koa();

// 127.0.0.1 主机 IP 地址
// localhost 主机域名
app.use(async (ctx) => {
  if (ctx.request.url === "/") {
    const htmlContent = await fs.readFile(path.join(__dirname, "./index.html"));
    ctx.response.body = htmlContent;
    ctx.response.set("Content-Type", "text/html");
  }

  if (ctx.request.url.endsWith(".js")) {
    console.log(ctx.request.url);
    // const jsContent = await fs.readFile(path.join(__dirname, ctx.request.url), {
    //   encoding: "utf-8",
    // });
    const jsPath = path.join(__dirname, ctx.request.url);
    const jsContent = await fs.readFile(jsPath, { encoding: "utf-8" });
    const resolvedContent = resolveAlias(
      viteConfig.resolve.alias,
      jsPath,
      jsContent,
    );
    ctx.response.body = resolvedContent;
    ctx.response.set("Content-Type", "text/javascript");
  }

  if (ctx.request.url.endsWith(".vue")) {
    const vueContent = await fs.readFile(
      path.join(__dirname, ctx.request.url),
      {
        encoding: "utf-8",
      },
    );
    // vite 先将 vue 代码编译为 JS 代码
    ctx.response.body = vueContent;
    // vite 开发服务器会设置 http 响应头 Content-Type=text/javascript
    // 告诉浏览器, 即使是 .vue 文件, 也请使用 JS 的方式解析
    ctx.response.set("Content-Type", "text/javascript");
  }
});

app.listen(5173, () => {
  console.log("http://localhost:5173");
});
