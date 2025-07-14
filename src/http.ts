interface Request {
  url: string;
}

type HandlerCallback = (value: { request: Request }) => HttpResponse;

export class Handler {
  readonly method: string;
  readonly callback: HandlerCallback;
  private readonly pathRegex: RegExp;
  constructor(path: string, method: "get" | "post", callback: HandlerCallback) {
    this.pathRegex = pathToRegex(path);
    this.method = method;
    this.callback = callback;
  }

  match(path: string): boolean {
    return this.pathRegex.test(path);
  }
}

function pathToRegex(path: string) {
  const regexStr = path
    .replace(/\./g, "\\.") // 转义点号
    .replace(/\/:([^/]+)/g, "/([^/]+)") // 把 ":param" 转为正则匹配
    .replace(/\//g, "\\/"); // 转义斜杠
  return new RegExp(`^${regexStr}$`);
}

export class HttpResponse {
  readonly body: any;
  readonly headers: any;
  constructor(body: any, headers: any = {}) {
    this.body = body;
    this.headers = headers;
  }
  static json(data: any) {
    return new HttpResponse(JSON.stringify(data), {
      "Content-Type": "application/json",
    });
  }
}

function get(path: string, callback: HandlerCallback) {
  return new Handler(path, "get", callback);
}

export const http = {
  get,
};
