# [Deligenius](https://www.deligenius.com/)

> Lightweight Deno middleware framework

#### Features

- 🐤 Light weight (11kb)
- 🚅 Near deno http module performance
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
import { Application } from "https://raw.githubusercontent.com/deligenius/deligenius/master/mod.ts";

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
