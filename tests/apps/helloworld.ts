// ./app.ts
import { Application } from "https://x.nest.land/deligenius@1.0.2/mod.ts";

let app = new Application({ port: 8000 }).listen();
console.log("server running at port 8000")

app.use((ctx) => {
  ctx.send("Hello World!");
});