import {
  Application,
  Router,
} from "https://deno.land/x/denotrain@v0.5.0/mod.ts";

const app = new Application({ port: 8000 });

// Middleware
app.use((ctx) => {
  ctx.res.body = "Hello World!";
});

await app.run();
