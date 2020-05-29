import {
  Request,
  Response,
  Middleware,
  Context,
  Application,
  resolveMiddlewares,
} from "./deligenius.ts";

import * as posix from "https://deno.land/std/path/posix.ts";

enum METHOD {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  CONNECT = "CONNECT",
  OPTIONS = "OPTIONS",
  TRACE = "TRACE",
  PATCH = "PATCH",
}

interface MiddlewareMap<S> extends Record<METHOD, Middleware<S>[]> {}

export class Router<S extends Record<string, any>> {
  basePath: string;
  routes: Record<string, MiddlewareMap<S>>;
  middlewares: Middleware<S>[];
  state: S;

  constructor(basePath: string) {
    this.basePath = basePath ?? "/";
    this.middlewares = [];
    this.state = <S> {};
    this.routes = {};
  }

  getThis() {
    return this;
  }

  use(func: Middleware<S>) {
    this.middlewares.push(func);
  }

  async route(self: Router<S>, context: Context<S>) {
    let path: any = context.req.url.split("?")[0];

    let route;
    if (route = this.routes[path]) {
      try {
        // resolve this.middleware(global middlewares) first
        await Promise.resolve(resolveMiddlewares(context, this.middlewares));

        let methodMiddlewares;
        if (methodMiddlewares = route[<METHOD> context.req.method]) {
          await Promise.resolve(resolveMiddlewares(context, methodMiddlewares));
        }
        methodMiddlewares = undefined;
      } catch (e) {
        this.handleError(e, context);
      }
    } else {
      context.req.respond({ status: 404 });
    }
    path = undefined;
    route = undefined;
  }

  handleError(err: Error, ctx: Context<S>) {
    console.log(this.basePath, ": ", err);
    ctx.req.respond({ status: 404 });
  }

  setState(state: S) {
    this.state = state;
  }

  private initMethod(path: string, method: METHOD) {
    if (!this.routes[path] || !this.routes[path][method]) {
      this.routes[path] = this.routes[path] ?? <MiddlewareMap<S>> {};
      this.routes[path][method] = [];
    }
  }

  get(path: string, func: Middleware<S>) {
    this.initMethod(path, METHOD.GET);
    this.routes[path][METHOD.GET].push(func);
  }

  post(path: string, func: Middleware<S>) {
    this.initMethod(path, METHOD.POST);
    this.routes[path][METHOD.POST].push(func);
  }
}

// console.log(posix.join("/", "/path", ":join", "/2?23/"));

// const url = new URL("/query?name=jun&age=30", `http://localhost:8000`);

// console.log(url);
