![](https://github.com/deligenius/deligenius/blob/master/img/deligenius.png?raw=true)
> A lightweight, high-performance and customizable web framework for Deno.

[![tag](https://img.shields.io/badge/Deno%20-std%400.59.0-333?&logo=Deno)](https://deno.land/std@0.59.0)
 [![nest badge](https://nest.land/badge.svg)](https://nest.land/package/deligenius)

 [www.DeliGenius.com](https://www.deligenius.com/)
#### Features

- 🐤 Light weight (11kb)
- 🚅 Extremely high performance [(97.74% of deno http module)](https://www.deligenius.com/docs/benchmark)
- 🤸‍♂️ Body parser middleware option
- ✔️ Gentle error handling

## Documentation

Please check out [Deligenius.com website](https://www.deligenius.com/)

- [Basic Routing](https://www.deligenius.com/docs/basic-routing)
- [Parsing Body](https://www.deligenius.com/docs/parsing-body)
- [Error Handling](https://www.deligenius.com/docs/error-handling)

### Hello World example

1. Use your favourite editor, copy below to `app.ts`

```ts
// ./app.ts
import { Application } from "https://x.nest.land/deligenius@1.0.2/mod.ts";

let app = new Application({ port: 8000 }).listen();

app.use((ctx) => {
  ctx.send("Hello World!");
});
```

2. Run program with

```ts
> deno run --allow-net ./app.ts
```


#### Contributors
[@gjuoun](https://github.com/gjuoun)
