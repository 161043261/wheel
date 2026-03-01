import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "http";
import EventEmitter from "events";
import { Request } from "./request.js";
import { Response } from "./response.js";
import { Context } from "./context.js";

type TCallback = (context: Context, next?: () => Promise<void>) => any;

class Application extends EventEmitter {
  request: Request;
  response: Response;
  context: Context;

  constructor() {
    super();
    this.request = new Request(this);
    this.response = new Response(this);
    this.context = new Context(this);
  }

  middleware: TCallback[] = [];

  use(fn: TCallback) {
    this.middleware.push(fn);
    return this;
  }

  handleRequest(req: IncomingMessage, res: ServerResponse) {
    const ctx = this.createContext(req, res);
    ctx.res.statusCode = 404;

    this.compose(ctx)
      .then(() => {
        const { body } = ctx;
        if (body) {
          res.end(JSON.stringify(body));
          return;
        }
        res.end("Not Found");
      })
      .catch((err) => {
        this.emit("error", err);
        res.end(
          JSON.stringify(
            err instanceof Error
              ? {
                  message: err.message,
                  stack: err.stack,
                }
              : err,
          ),
        );
      });
  }

  compose(ctx: Context): Promise<any> {
    const middleware = this.middleware;
    let preIdx = -1;

    const dispatch = (idx: number): Promise<any> => {
      if (idx <= preIdx) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      preIdx = idx;
      if (idx >= middleware.length) {
        return Promise.resolve();
      }
      const cb = middleware[idx];
      try {
        const res = cb(ctx, () => dispatch(idx + 1));
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    };

    return dispatch(0);
  }

  createContext(req: IncomingMessage, res: ServerResponse): Context {
    const context: Context = Object.create(this.context);
    const request: Request = (context.request = Object.create(
      this.request,
    ) as Request);
    const response: Response = (context.response = Object.create(
      this.response,
    ) as Response);

    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;

    request.response = response;
    response.request = request;

    context.originalUrl = request.originalUrl = req.url;
    context.state = {};

    return context;
  }

  listen(...args: Parameters<Server["listen"]>) {
    const server = createServer(this.handleRequest.bind(this));
    server.listen(...args);
  }

  toJSON() {
    return {};
  }
}

export default Application;
