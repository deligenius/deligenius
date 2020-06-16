import {Application} from "https://raw.githubusercontent.com/deligenius/dg.ts/master/mod.ts";

let app = new Application({ port: 8000 }).listen();

app.use( (ctx, next) => {
  ctx.send("Hello World!")
});
