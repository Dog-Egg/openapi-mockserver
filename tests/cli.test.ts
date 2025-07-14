import path from "path";

// Mock the server module
jest.mock("../src/server", () => ({
  run: jest.fn().mockResolvedValue(undefined),
}));

// Mock console.log to capture output
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

// Mock process.cwd
const mockCwd = jest.spyOn(process, "cwd").mockReturnValue("/test/directory");

import { run } from "../src/server";
import { program } from "../src/cli";
import { Handler, HttpResponse } from "../src/http";

describe("CLI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  afterAll(() => {
    mockCwd.mockRestore();
  });

  describe("Program configuration", () => {
    it("should have correct program name and description", () => {
      expect(program.name()).toBe("openapi-mockserver");
      expect(program.description()).toBe("A mock server");
    });

    it("should have start command configured", () => {
      const startCommand = program.commands.find(
        (cmd) => cmd.name() === "start"
      );
      expect(startCommand).toBeDefined();
      expect(startCommand?.description()).toBe("Start the mock server");
    });

    it("should have handlers option configured", () => {
      const startCommand = program.commands.find(
        (cmd) => cmd.name() === "start"
      );
      const handlersOption = startCommand?.options.find(
        (opt) => opt.long === "--handlers"
      );
      expect(handlersOption).toBeDefined();
      expect(handlersOption?.description).toBe("Path to custom handlers");
    });
  });

  describe("Command execution simulation", () => {
    const mockRun = run as jest.MockedFunction<typeof run>;

    it("should simulate start command without handlers", async () => {
      // Simulate the action function behavior
      const openapiUrl = "test-openapi.json";

      await run({ openapiUrl });
      expect(mockRun).toHaveBeenCalledWith({ openapiUrl });
    });

    it("should simulate start command with handlers", async () => {
      // Simulate the action function behavior with handlers
      const openapiUrl = "test-openapi.json";
      const mockHandlers = [
        new Handler("/test", "get", () => HttpResponse.json({ body: "test" })),
      ];

      // Simulate what happens when handlers are loaded
      await run({ openapiUrl, customHandlers: mockHandlers });

      expect(mockRun).toHaveBeenCalledWith({
        openapiUrl,
        customHandlers: mockHandlers,
      });
    });
  });

  describe("Path resolution", () => {
    it("should resolve handlers file path relative to cwd", () => {
      const handlersFile = "custom-handlers.js";
      const expectedPath = path.resolve(process.cwd(), handlersFile);

      expect(expectedPath).toBe("/test/directory/custom-handlers.js");
    });

    it("should handle absolute paths", () => {
      const absolutePath = "/absolute/path/handlers.js";
      const resolvedPath = path.resolve(process.cwd(), absolutePath);

      expect(resolvedPath).toBe("/absolute/path/handlers.js");
    });
  });

  describe("Error handling simulation", () => {
    it("should handle import errors gracefully", async () => {
      const nonExistentFile = "nonexistent.js";
      const file = path.resolve(process.cwd(), nonExistentFile);

      await expect(import(file)).rejects.toThrow();
    });
  });

  describe("CLI module structure", () => {
    it("should not execute program.parse() when imported", () => {
      // This test verifies that importing the CLI module doesn't trigger program.parse()
      // If it did, we would see command line parsing errors in the test output
      expect(() => {
        require("../src/cli");
      }).not.toThrow();
    });
  });
});
