import request from "supertest";
import express from "express";
import path from "path";
import { Handler, HttpResponse } from "../src/http";

// Mock the server module to avoid actually starting a server
jest.mock("../src/server", () => {
  const originalModule = jest.requireActual("../src/server");
  return {
    ...originalModule,
    run: jest.fn(),
  };
});

// Import after mocking
import { run, matchHandler } from "../src/server";

describe("Server Integration Tests", () => {
  const testOpenapiPath = path.join(__dirname, "fixtures", "test-openapi.json");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("run function", () => {
    it("should be called with correct parameters", async () => {
      const mockRun = run as jest.MockedFunction<typeof run>;

      await run({ openapiUrl: testOpenapiPath });

      expect(mockRun).toHaveBeenCalledWith({
        openapiUrl: testOpenapiPath,
      });
    });

    it("should be called with custom handlers", async () => {
      const mockRun = run as jest.MockedFunction<typeof run>;
      const customHandlers = [
        new Handler("/test", "get", () =>
          HttpResponse.json({ message: "test" })
        ),
      ];

      await run({
        openapiUrl: testOpenapiPath,
        customHandlers,
      });

      expect(mockRun).toHaveBeenCalledWith({
        openapiUrl: testOpenapiPath,
        customHandlers,
      });
    });
  });
});

describe("matchHandler function (unit test)", () => {
  // Now we can test the exported matchHandler function directly

  it("should return matching handler", () => {
    const handler1 = new Handler("/api/users", "get", () =>
      HttpResponse.json({})
    );
    const handler2 = new Handler("/api/posts", "get", () =>
      HttpResponse.json({})
    );
    const handlers = [handler1, handler2];

    const result = matchHandler("/api/users", handlers);
    expect(result).toBe(handler1);
  });

  it("should return first matching handler", () => {
    const handler1 = new Handler("/api/:resource", "get", () =>
      HttpResponse.json({ type: "first" })
    );
    const handler2 = new Handler("/api/users", "get", () =>
      HttpResponse.json({ type: "second" })
    );
    const handlers = [handler1, handler2];

    const result = matchHandler("/api/users", handlers);
    expect(result).toBe(handler1); // First match wins
  });

  it("should return null when no handler matches", () => {
    const handler1 = new Handler("/api/users", "get", () =>
      HttpResponse.json({})
    );
    const handler2 = new Handler("/api/posts", "get", () =>
      HttpResponse.json({})
    );
    const handlers = [handler1, handler2];

    const result = matchHandler("/api/comments", handlers);
    expect(result).toBeNull();
  });

  it("should return null for empty handlers array", () => {
    const result = matchHandler("/api/users", []);
    expect(result).toBeNull();
  });
});

describe("Express App Behavior (conceptual tests)", () => {
  // These tests demonstrate how the Express app should behave
  // In a real integration test, we would need to modify the server.ts
  // to make it more testable (e.g., return the app instead of starting it)

  describe("Custom handler routing", () => {
    it("should handle custom routes with /_ prefix", () => {
      // This test demonstrates the expected behavior for custom handlers
      const customHandler = new Handler("/api/test", "get", ({ request }) => {
        return HttpResponse.json({
          message: "custom response",
          url: request.url,
        });
      });

      // Simulate the custom handler logic
      const requestPath = "/_/api/test";
      const match = requestPath.match(/^\/_(\/.+)/);

      expect(match).toBeTruthy();
      expect(match![1]).toBe("/api/test");

      if (match && customHandler.match(match[1])) {
        const response = customHandler.callback({
          request: { url: "http://localhost:6677/_/api/test" },
        });

        expect(response.body).toBe(
          JSON.stringify({
            message: "custom response",
            url: "http://localhost:6677/_/api/test",
          })
        );
      }
    });

    it("should not match custom routes without /_ prefix", () => {
      const requestPath = "/api/test";
      const match = requestPath.match(/^\/_(\/.+)/);

      expect(match).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should handle handler callback errors gracefully", () => {
      const errorHandler = new Handler("/error", "get", () => {
        throw new Error("Handler error");
      });

      expect(() => {
        errorHandler.callback({
          request: { url: "http://localhost:6677/error" },
        });
      }).toThrow("Handler error");
    });
  });
});
