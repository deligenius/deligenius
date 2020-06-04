import {
  serve,
  serveTLS,
  ServerRequest,
  HTTPOptions,
  Server as HttpServer,
  HTTPSOptions,
} from "../deps.ts";

import { Router } from "./router.ts";
import { HttpError } from "./httpError.ts";

export interface Request extends ServerRequest {
  [key:string] : any
  // query?: object;
  // params?: object;
  // json?: object;
  // urlencoded?: object;
  // text?: string;
  // html?: string;
  // javascript?: string;
  // xml?: object;
  // graphql?: object;
  // file?: { ext: string; content: Uint8Array };
}
export interface Response {
  headers?: Headers;
  body?: string;
  status?: number;
}

interface ContextIntf<S> {
  req: Request;
  res: Response;
  state: S;
}

export interface Middleware<State> {
  (ctx: Context<State>, next: Function, router?: Router<State>): void;
}

export class Context<S> implements ContextIntf<S> {
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
  private options!: HTTPOptions | HTTPSOptions;
  private state: S | any;
  private routerMap!: Map<string, Router<S>>;

  constructor(options: HTTPOptions | HTTPSOptions) {
    this.options = options;
    this.middlewares = [];
    this.state = {};
  }

  setState(state: S) {
    this.state = state;
  }

  use(...middRouters: (Middleware<S> | Router<S>)[]) {
    for (let middRouter of middRouters) {
      if (middRouter instanceof Router) {
        this.registerRouter(middRouter);
      } else {
        this.middlewares.push(middRouter);
      }
    }
  }

  private registerRouter(router: Router<S>) {
    if (!this.routerMap) {
      this.routerMap = new Map();
    }

    // /path/to/router => new Router('/path/to/router')
    this.routerMap.set(router.basePath, router);
  }

  listen() {
    this.serve();
    return this;
  }

  private async serve() {
    // if it's https server
    if ("certFile" in this.options) {
      this.server = serveTLS(this.options);
    } else {
      this.server = serve(this.options);
    }

    for await (const req of this.server) {
      this.handleRequest(req);
    }
  }

  private async handleRequest(req: ServerRequest) {
    let context: any = new Context(req, this.state);

    try {
      // resolve global middlewares
      await Promise.resolve(this.resolveMiddlewares(context, this.middlewares));
    } catch (e) {
      this.handleError(e, context);
    }

    if (this.routerMap) {
      this.route(context);
    } else {
      this.handleError(
        new HttpError("You don't have any routers", 404),
        context,
      );
    }

    // recycle vars
    context = undefined;
  }

  private route(context: Context<S>) {
    let markIndex = context.req.url.indexOf("?");
    let fullpath;
    if (markIndex > 0) {
      fullpath = context.req.url.substring(0, markIndex);
    } else {
      fullpath = context.req.url;
    }
    let pathArr = fullpath.split("/");

    // loop through /base => /base/path => /base/path/found
    // until found a router matches it
    let path = "";
    let router;
    for (let item of pathArr) {
      if (item) {
        path += "/" + item;
        if (router = this.routerMap.get(path)) {
          router.handleRequest(context, fullpath);
          return router;
        }
      }
    }
    if (!router) {
      this.handleError(new HttpError("No router matches", 404), context);
    }
  }

  handleError(err: Error, ctx: Context<S>) {
    if (err instanceof HttpError) {
      ctx.req.respond({ status: err.status });
    } else {
      ctx.req.respond({ status: 404 });
    }
  }

  close() {
    this.server.close();
  }

  private resolveMiddlewares(
    context: Context<S>,
    middlewares: Middleware<S>[],
  ) {
    if (middlewares.length === 0) {
      return;
    }
    return new Promise(async (resolve, reject) => {
      let middlewareIndex = -1;

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
          let fn = middlewares[i];
          try {
            await fn(context, _resolveMiddleware.bind(null, context, i + 1));
          } catch (err) {
            this.handleError(err, context);
          }
        }
      };

      _resolveMiddleware(context);
    });
  }
}
