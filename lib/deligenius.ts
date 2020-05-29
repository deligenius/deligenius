import {
  serve,
  ServerRequest,
  HTTPOptions,
  Server as HttpServer,
} from "../deps.ts";

import { Router } from "./router.ts";

export interface Request extends ServerRequest {
  cookies?: Record<string, string>;
  query?: Record<string, string>;
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

  constructor(req: Request, res: Response, state: S) {
    this.req = req;
    this.state = state;
    this.res = <Response> {
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
    } else if (typeof data === "string") {
      this.res.body = <string> data;
    }

    this.req.respond({
      status: this.res.status ?? 200,
      headers: this.res.headers ?? undefined,
      body: this.res.body ?? undefined,
    });
  }
}

export class Application<S extends Record<string, any>> {
  private server!: HttpServer;
  private middlewares: Middleware<S>[];
  private options!: HTTPOptions;
  private state: S;
  private routers: Router<S>[];

  constructor(options: HTTPOptions) {
    this.options = options;
    this.middlewares = [];
    this.state = <S> {};
    this.routers = [];
  }

  setState(state: S) {
    this.state = state;
  }

  use(middRouter: Middleware<S> | Router<S>) {
    if (middRouter instanceof Router) {
      this.routers.push(middRouter);
    } else {
      this.middlewares.push(middRouter);
    }
  }

  async listen() {
    this.server = serve(this.options);
    for await (const req of this.server) {
      this.handleRequest(req);
    }
  }

  private async handleRequest(req: ServerRequest) {
    let state = this.state;
    let routers = this.routers;

    let context: Context<S> | undefined = new Context(req, {}, state);

    try {
      // resolve global middlewares
      await Promise.resolve(resolveMiddlewares(context, this.middlewares));

      if (routers.length >= 1) {
        for (let router of routers) {
          if (req.url.startsWith(router.basePath)) {
            router.route(router, context);
          }
        }
      }
    } catch (e) {
      this.handleError(e, context);
    }

    // recycle context
    context = undefined;
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
        } catch (e) {
          reject(e.message);
        }
      }
    };
    _resolveMiddleware(context);
  });
}
