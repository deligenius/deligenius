# deligenius


> Lightweight Deno middleware framework

### Features

- Light weight (11kb)
- Near deno http module performance
- Body parser middleware option
- Gentle error handling

## Quick Start

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

### Router


If you write code in the `express.js` way, it's recommended to use `Router`, as it comes with restful methods: `get`, `post`, `put`, `delete` ...

```ts
import {
  Application,
  Router,
} from "https://raw.githubusercontent.com/deligenius/deligenius/master/mod.ts";

let app = new Application({ port: 8000 }).listen();
let router = new Router("/");

app.use(router);

router.get("/", ({ req, res }, next) => {
  res.send("You reached " + req.url);
});
```
## [🔝](#features)

### Use BodyParser



`deligenius` has a separate middleware module: `bodyParser`, which can be used to parse **parameter**, **query**, **json** etc,.
We will use `mid` from [bodyParser](https://github.com/deligenius/bodyparser) which includes many pre-configured middlewares for `deligenius`

#### Get `query` parameter

```ts
import {
  Application,
  Router,
} from "https://raw.githubusercontent.com/deligenius/deligenius/master/mod.ts";
import { mid } from "https://raw.githubusercontent.com/deligenius/bodyparser/master/mod.ts";

let app = new Application({ port: 8000 }).listen();

app.use(mid.query(), (ctx) => {
  let query = ctx.req.query;
  ctx.send(query);
});
```

#### Get `json` data

```ts
app.use(mid.json(), (ctx) => {
  let json = ctx.req.json;
  ctx.send(json);
});
```

#### Get `params`

```ts
app.use(mid.params("/:name/:age"), (ctx) => {
  let params = ctx.req.params;
  ctx.send(params);
});
```

#### Get `multipart/form-data`

  - consider use `deligenius` official [Multiparser](https://github.com/deligenius/multiparser)

#### Get `urlencoded` form data

```ts
app.use(mid.urlencoded(), (ctx) => {
  let urlencoded = ctx.req.urlencoded;
  ctx.send(urlencoded);
});
```
## [🔝](#features)


### Error handling



`deligenius` has a default error handler `handleError` in every ```Application``` and ```Router```

#### Error handling In middleware
```ts
app.use(async (ctx, next) => {
  try {
    methodThrowError()
  } catch (e) {
    console.log(e);
  }
});
```
#### Throw **HttpError**
  - All the ```throw new HttpError(message, statusCode)``` will be handled by the ```app.handleError``` or ```router.handleError```
```ts
app.use(async (ctx, next) => {
  throw new HttpError("no user found", 404)
});
```

#### Override ```errorHandler```
  - ```app.errorHandler``` and ```router.errorHandler``` can be override
```ts
app.handleError = (err, ctx) => {
  if (err instanceof HttpError) {
    ctx.status(err.status).send("http error");
  } else {
    ctx.send("some other error");
  }
};
```
## [🔝](#features)

#### Contributors
[@gjuoun](https://github.com/gjuoun)
