#!/usr/bin/env node

import { program } from "commander";
import { run } from "./server";
import path from "node:path";
import "ts-node/register";

program.description("A mock server");

program
  .name("openapi-mockserver")
  .command("start")
  .description("Start the mock server")
  .argument("openapi-url")
  .option("--handlers <file>", "Path to custom handlers")
  .action(async function (openapiUrl) {
    console.log("Starting mock server...");

    const handlers = this.opts().handlers;
    if (handlers) {
      const file = path.resolve(process.cwd(), handlers);
      const customHandlers = (await import(file)).default;
      await run({ openapiUrl, customHandlers });
    } else {
      await run({ openapiUrl });
    }
  });

// Export program for testing
export { program };

// Only parse when this file is run directly
if (require.main === module) {
  program.parse();
}
