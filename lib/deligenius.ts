import {
  serve,
  ServerRequest,
  HTTPOptions,
  Server as HttpServer,
} from "../deps.ts";

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

interface Server<State> {
  server: HttpServer;
  middwares: Middleware<State>[];
  options: HTTPOptions;
  use: (func: Middleware<State>) => void;
  listen: (option: HTTPOptions) => void;
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
    return this
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

export class Application<S> implements Server<S> {
  server!: HttpServer;
  middwares: Middleware<S>[];
  options!: HTTPOptions;
  #state: S;

  constructor(options: HTTPOptions) {
    this.options = options;
    this.middwares = [];
    this.#state = <S> {};
  }

  setState(state: S) {
    this.#state = state;
  }

  use(func: Middleware<S>) {
    this.middwares.push(func);
  }

  async listen() {
    this.server = serve(this.options);
    for await (const req of this.server) {
      this.handleRequest(req);
    }
  }

  async handleRequest(req: ServerRequest) {
    let state = this.#state;
    let context: Context<S> | undefined = new Context(req, {}, state);

    try {
      await Promise.resolve(resolveMiddlewares(context, this.middwares));
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

function resolveMiddlewares<S>(
  context: Context<S>,
  middlewares: Middleware<S>[],
) {
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
