import {
  Request,
  Response,
  Middleware,
  Context,
  Application,
  resolveMiddlewares,
} from "./deligenius.ts";

import * as posix from "https://deno.land/std/path/posix.ts";

export enum METHOD {
  ALL = "ALL",
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  CONNECT = "CONNECT",
  OPTIONS = "OPTIONS",
  TRACE = "TRACE",
  PATCH = "PATCH",
}

interface MiddlewareMap<S> extends Map<METHOD, Middleware<S>[]> {}

export class Router<State> {
  basePath: string;
  routes: Map<string, MiddlewareMap<State>>;
  routerMap!: Map<string, Router<State>>;

  constructor(basePath: string) {
    this.basePath = basePath;
    // init METHOD.ALL middlewares
    this.routes = new Map();
    this.routes.set("/", new Map());
    this.routes.get("/")!.set(METHOD.ALL, []);
  }

  use(middRouter: Middleware<State> | Router<State>) {
    if (middRouter instanceof Router) {
      this.registerRouter(middRouter);
    } else {
      this.routes.get("/")!.get(METHOD.ALL)!.push(middRouter);
    }
  }

  private registerRouter(router: Router<State>) {
    if (!this.routerMap) {
      this.routerMap = new Map();
    }

    // /path/to/router => new Router('/path/to/router')
    this.routerMap.set(router.basePath, router);
  }

  async handleRequest(context: Context<State>, relativePath: string) {
    // replace '/basePath/path' to '/path' = routerPath
    relativePath = relativePath.replace(new RegExp(`^${this.basePath}`), "");
    let routePath: any = posix.join("/", relativePath);

    let route, router;
    // handle router middlewares
    if (route = this.routes.get(routePath)) {
      try {
        // process router level middlewares
        let middlewares: any;
        if (middlewares = route.get(METHOD.ALL)) {
          await Promise.resolve(resolveMiddlewares(context, middlewares));
        }
        // process method level middlewares
        let methodMiddlewares: any;
        if (methodMiddlewares = route.get(<METHOD> context.req.method)) {
          await Promise.resolve(resolveMiddlewares(context, methodMiddlewares));
        }
        middlewares = undefined;
        methodMiddlewares = undefined;
      } catch (e) {
        this.handleError(e, context);
      }
    } // past context to the next router
    else if (router = this.routerMap.get(routePath)) {
      router.handleRequest(context, routePath);
    } else {
      context.req.respond({ status: 404 });
    }

    routePath = undefined;
    route = undefined;
    router = undefined;
  }

  handleError(err: Error, ctx: Context<State>) {
    console.log(ctx.req.url, ": ", err);
    ctx.req.respond({ status: 404 });
  }

  private initMethod(path: string, method: METHOD, next: Middleware<State>) {
    // setup router map
    if (!this.routes.has(path)) {
      this.routes.set(path, new Map());
    }

    // setup router middlewares
    if (!this.routes.get(path)!.has(method)) {
      this.routes.get(path)!.set(method, []);
    }
    // use path '/basepath' as ''
    // let relativePath = path === this.basePath ? "" : path;
    this.routes.get(path)!.get(method)!.push(next);
  }

  get(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.GET, func);
  }

  post(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.POST, func);
  }

  put(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.PUT, func);
  }

  delete(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.DELETE, func);
  }

  connect(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.CONNECT, func);
  }

  options(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.OPTIONS, func);
  }

  trace(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.TRACE, func);
  }

  patch(path: string, func: Middleware<State>) {
    this.initMethod(path, METHOD.PATCH, func);
  }
}
