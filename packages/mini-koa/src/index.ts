import Application from "./application.js";

const app = new Application();

function sleep(seconds: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, seconds * 1000);
  });
}

app.use(async (ctx, next) => {
  ctx.body = {};
  ctx.body.a = 1;
  console.log(1);

  // 不 await
  // 打印 1 3 2 5 6 4, 返回 {"a":2,"b":3}

  // await
  // 打印 1 3 5 6 4 2, 返回 {"a":2,"b":4,"c":6}
  // next();
  await next();

  ctx.body.a = 2;
  console.log(2);
});

app.use(async (ctx, next) => {
  ctx.body.b = 3;
  console.log(3);
  await sleep(3);

  // next();
  await next();
  // await next();

  ctx.body.b = 4;
  console.log(4);
});

app.use(async (ctx, next) => {
  ctx.body.c = 5;
  console.log(5);

  // next();
  await next();

  ctx.body.c = 6;
  console.log(6);
});

app.listen(3000, () => {
  console.log("server is running at http://127.0.0.1:3000");
});

app.on("error", console.error);
