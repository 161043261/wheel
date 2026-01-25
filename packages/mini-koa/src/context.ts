import type { IncomingMessage, ServerResponse } from "http";
import type Application from "./application.js";
import { Request } from "./request.js";
import { Response } from "./response.js";

export class Context {
  app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  req?: IncomingMessage;
  res?: ServerResponse;

  request?: Request;
  response?: Response;

  originalUrl: string | undefined;
  state: Record<string, any> = {};

  get url() {
    return this.request?.url;
  }

  get query() {
    return this.request?.query;
  }

  set body(val: any) {
    if (!this.response) {
      return;
    }
    this.response.body = val;
  }

  get body() {
    return this.response?.body;
  }

  toJSON() {
    return {
      request: this.request?.toJSON(),
      response: this.response?.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
    };
  }
}
