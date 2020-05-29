import {
  serve,
  ServerRequest,
  HTTPOptions,
  Server as HttpServer,
} from "../deps.ts";

import { Router, METHOD } from "./router.ts";
import { posix } from "https://deno.land/std/path/mod.ts";
export interface Request extends ServerRequest {
  path?: string;
  query?: string;
}
export interface Response {
  headers?: Headers;
  body?: string;
  status?: number;
}

export interface Middleware<State> {
  (ctx: Context<State>, next: Function): void;
}

export class Context<S> {
  req: Request;
  res: Response;
  state: S;

  constructor(req: Request, state: S) {
    this.req = req;
    this.state = state;
    this.res = {
      status: 200,
      headers: new Headers(),
      body: "",
    };
  }

  status(status: number) {
    this.res.status = status;
    return this;
  }

  send(data: object | string) {
    if (typeof data === "object") {
      this.res.body = JSON.stringify(data);
      this.res.headers!.set("content-type", "application/json");
    } else {
      this.res.body = data;
    }

    this.req.respond({
      status: this.res.status,
      headers: this.res.headers,
      body: this.res.body,
    });
  }
}

export class Application<S extends Record<string, any>> {
  private server!: HttpServer;
  private middlewares: Middleware<S>[];
  private options!: HTTPOptions;
  private state: S | any;
  private routerMap!: Map<string, Router<S>>;

  constructor(options: HTTPOptions) {
    this.options = options;
    this.middlewares = [];
    this.state = {};
  }

  setState(state: S) {
    this.state = state;
  }

  use(middRouter: Middleware<S> | Router<S>) {
    if (middRouter instanceof Router) {
      this.registerRouter(middRouter);
    } else {
      this.middlewares.push(middRouter);
    }
  }

  private registerRouter(router: Router<S>) {
    if (!this.routerMap) {
      this.routerMap = new Map();
    }

    // /path/to/router => new Router('/path/to/router')
    this.routerMap.set(router.basePath, router);
  }

  async listen() {
    this.server = serve(this.options);
    for await (const req of this.server) {
      this.handleRequest(req);
    }
  }

  private async handleRequest(req: ServerRequest) {
    let context: any = new Context(req, this.state);

    try {
      // resolve global middlewares
      await Promise.resolve(resolveMiddlewares(context, this.middlewares));
    } catch (e) {
      this.handleError(e, context);
    }

    if (this.routerMap) {
      this.route(context);
    } else {
      this.handleError(new Error("No route found"), context);
    }

    // recycle vars
    context = undefined;
  }

  private route(context: Context<S>) {
    let fullpath: any = context.req.url.split("?")[0];
    let pathArr: any = fullpath.split("/");

    // loop through /base => /base/path => /base/path/found
    // until found a router matches it
    let path: any = "";
    for (let item of pathArr) {
      if (item) {
        path += "/" + item;
        let router;
        if (router = this.routerMap.get(path)) {
          router.handleRequest(context, fullpath);
          break;
        }
        router = undefined;
      }
    }

    fullpath = undefined;
    pathArr = undefined;
    path = undefined;
  }

  handleError(err: Error, ctx: Context<S>) {
    console.log(err);
    ctx.req.respond({ status: 404 });
  }

  close() {
    this.server.close();
  }
}

export function resolveMiddlewares<S>(
  context: Context<S>,
  middlewares: Middleware<S>[],
) {
  if (middlewares.length === 0) {
    return;
  }
  return new Promise(async (resolve, reject) => {
    let middlewareIndex: any = -1;

    let _resolveMiddleware = async (context: Context<S>, i: number = 0) => {
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
        let fn: any = middlewares[i];
        try {
          await fn(context, _resolveMiddleware.bind(null, context, i + 1));
        } catch (e) {
          reject(e.message);
        }
        fn = undefined;
      }
    };

    middlewareIndex = undefined;
    _resolveMiddleware(context);
  });
}
