import express, { Express, Request, Response, NextFunction } from "express";
import { getHttpOperationsFromSpec } from "@stoplight/prism-cli/dist/operations";
import { createClientFromOperations } from "@stoplight/prism-http/dist/client";
import type { HttpMethod } from "@stoplight/types";
import pino from "pino";
import { Handler } from "./http";

export function matchHandler(
  path: string,
  handlers: Handler[]
): Handler | null {
  for (const handler of handlers) {
    if (handler.match(path)) {
      return handler;
    }
  }
  return null;
}

export function createCustomHandlerMiddleware(customHandlers?: Handler[]) {
  return (req: any, res: any, next: any) => {
    // 如果请求路径以 /_ 开头，表示是自定义的 mock 请求
    if (customHandlers) {
      const match = req.path.match(/^\/_(\/.+)/);
      if (match) {
        const handler = matchHandler(match[1], customHandlers);
        if (handler) {
          try {
            const response = handler.callback({
              request: {
                url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
              },
            });
            res.header(response.headers).send(response.body);
            return;
          } catch (error) {
            res.status(500).json({
              error: "Custom handler failed",
              detail: error instanceof Error ? error.message : "Unknown error",
            });
            return;
          }
        }
      }
    }
    next();
  };
}

export function createPrismMiddleware(
  client: any,
  customHandlers?: Handler[],
  port: number = 6677
) {
  return (req: any, res: any) => {
    let config: { isProxy?: boolean; upstream?: URL } | undefined;
    if (customHandlers && matchHandler(req.path, customHandlers)) {
      // 匹配上自定义的 mock 请求，需要代理到 /_ 开头的路径
      config = {
        isProxy: true,
        upstream: new URL(`http://localhost:${port}/_/`),
      };
    }

    client
      .request(
        req.url,
        { method: req.method.toLowerCase() as HttpMethod },
        config
      )
      .then((prismRes: any) => {
        if (
          prismRes.violations.input.length ||
          prismRes.violations.output.length
        ) {
          res.status(400).json({
            violations: prismRes.violations,
          });
          return;
        }
        res.status(prismRes.status).set(prismRes.headers).send(prismRes.data);
      })
      .catch((err: any) => {
        res.status(500).json({ error: "Mock failed", detail: err.message });
      });
  };
}

export interface ServerConfig {
  openapiUrl: string;
  customHandlers?: Handler[];
  port?: number;
}

export async function createApp(config: ServerConfig) {
  const { openapiUrl, customHandlers, port = 6677 } = config;

  const operations = await getHttpOperationsFromSpec(openapiUrl);

  const logger = pino({ level: "info" });
  // @ts-ignored
  logger.success = logger.info;

  const client = createClientFromOperations(operations, {
    logger,
    mock: { dynamic: true },
    validateRequest: false,
    validateResponse: true,
    checkSecurity: false,
    errors: true,
    upstreamProxy: undefined,
    isProxy: false,
  });

  const app = express();

  // Apply middlewares
  app.use(createCustomHandlerMiddleware(customHandlers));
  app.use(createPrismMiddleware(client, customHandlers, port));

  return { app, port };
}

export async function run(config: ServerConfig) {
  const { app, port } = await createApp(config);

  app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
  });
}
