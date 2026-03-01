import type { IncomingMessage, ServerResponse } from "http";
import type Application from "./application.js";
import { Request } from "./request.js";

export class Response {
  app: Application;
  _body?: any | undefined = undefined;

  constructor(app: Application) {
    this.app = app;
  }

  req?: IncomingMessage;
  res?: ServerResponse;
  request?: Request;

  get status() {
    return this.res?.statusCode;
  }

  get message() {
    return this.res?.statusMessage;
  }

  get headers() {
    return this.req?.headers;
  }

  get body() {
    return this._body;
  }

  set body(val: any) {
    this.res.statusCode = 200;
    this._body = val;
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      headers: this.headers,
    };
  }
}
