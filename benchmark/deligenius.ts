import { Application } from "../mod.ts";

let app = new Application({ port: 8000 }).listen();

app.use((ctx, next) => {
  ctx.send("Hello World!");
});
