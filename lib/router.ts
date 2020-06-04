import {
  Middleware,
  Context,
} from "./application.ts";

import { HttpError } from "./httpError.ts";

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

export class Router<State extends Record<string, any>> {
  basePath: string;
  basePathRegexp: RegExp;
  routes: Map<string, MiddlewareMap<State>>;
  routerMap!: Map<string, Router<State>>;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.basePathRegexp = new RegExp(`^${this.basePath}`);
    // init METHOD.ALL middlewares
    this.routes = new Map();
    this.routes.set("/", new Map());
    this.routes.get("/")!.set(METHOD.ALL, []);
  }

  use(...middRouters: (Middleware<State> | Router<State>)[]) {
    for (let middleRouter of middRouters) {
      if (middleRouter instanceof Router) {
        this.registerRouter(middleRouter);
      } else {
        this.routes.get("/")!.get(METHOD.ALL)!.push(middleRouter);
      }
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
    let routePath: any = relativePath.substring(this.basePath.length) || "/";

    let route;
    // handle router middlewares
    if (route = this.routes.get(routePath)) {
      // process router level middlewares
      let middlewares: any;
      if ((middlewares = route.get(METHOD.ALL)) && middlewares.length > 0) {
        await Promise.resolve(this.resolveMiddlewares(context, middlewares));
      }
      // process method level middlewares
      let methodMiddlewares: any;
      if (methodMiddlewares = route.get(<METHOD> context.req.method)) {
        await Promise.resolve(
          this.resolveMiddlewares(context, methodMiddlewares),
        );
      }
    } // past context to the next router
    else if (this.routerMap && this.routerMap.has(routePath)) {
      this.routerMap.get(routePath)!.handleRequest(context, routePath);
    } else {
      // no route/router matches, it may be a params request
      let methodMiddlewares = this.routes.get("/")!.get(
        <METHOD> context.req.method,
      );
      if (methodMiddlewares && methodMiddlewares.length > 0) {
        await Promise.resolve(
          this.resolveMiddlewares(context, methodMiddlewares!),
        );
      } else {
        this.handleError(
          new HttpError(
            "No router/middleware matches at " + context.req.url,
            404,
          ),
          context,
        );
      }
    }

    // routePath = undefined;
    // route = undefined;
    // router = undefined;
  }

  handleError(err: HttpError, ctx: Context<State>) {
    if (err instanceof HttpError) {
      ctx.req.respond({ status: err.status });
    } else {
      ctx.req.respond({ status: 404 });
    }
  }

  private initMethod(
    path: string,
    method: METHOD,
    middlewares: Middleware<State>[],
  ) {
    // setup router map
    if (!this.routes.has(path)) {
      this.routes.set(path, new Map());
    }

    // setup router middlewares
    if (!this.routes.get(path)!.has(method)) {
      this.routes.get(path)!.set(method, []);
    }
    this.routes.get(path)!.get(method)!.push(...middlewares);
  }

  get(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.GET, middlewares);
  }

  post(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.POST, middlewares);
  }

  put(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.PUT, middlewares);
  }

  delete(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.DELETE, middlewares);
  }

  connect(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.CONNECT, middlewares);
  }

  options(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.OPTIONS, middlewares);
  }

  trace(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.TRACE, middlewares);
  }

  patch(path: string, ...middlewares: Middleware<State>[]) {
    this.initMethod(path, METHOD.PATCH, middlewares);
  }

  private resolveMiddlewares(
    context: Context<State>,
    middlewares: Middleware<State>[],
  ) {
    if (middlewares.length === 0) {
      return;
    }
    return new Promise(async (resolve, reject) => {
      let middlewareIndex = -1;

      let _resolveMiddleware = async (
        context: Context<State>,
        i: number = 0,
      ) => {
        // keep tracking index to prevent over call next()
        if (i <= middlewareIndex) {
          reject("next() called multiple times");
        } else {
          middlewareIndex = i;
        }

        if (i === middlewares.length) {
          resolve();
        } // exec middleware functions
        else {
          let fn = middlewares[i];
          try {
            await fn(
              context,
              _resolveMiddleware.bind(null, context, i + 1),
              this,
            );
          } catch (err) {
            this.handleError(err, context);
          }
        }
      };

      _resolveMiddleware(context);
    });
  }
}
