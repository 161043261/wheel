import type { IncomingMessage, ServerResponse } from "http";
import type Application from "./application.js";
import { Response } from "./response.js";

export class Request {
  app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  req?: IncomingMessage;
  res?: ServerResponse;
  response?: Response;
  originalUrl: string | undefined;

  get method() {
    return this.req?.method;
  }

  get url() {
    return this.req?.url;
  }

  get query() {
    if (!this.url) {
      throw new Error("Internal Server Error");
    }
    return new URL(this.url).searchParams;
  }

  get headers() {
    return this.req?.headers;
  }

  toJSON() {
    return {
      method: this.method,
      url: this.url,
      headers: this.headers,
    };
  }
}
