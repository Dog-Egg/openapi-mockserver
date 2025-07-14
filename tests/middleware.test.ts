import { Handler, HttpResponse } from "../src/http";
import {
  createCustomHandlerMiddleware,
  createPrismMiddleware,
  matchHandler,
} from "../src/server";

describe("Middleware Tests", () => {
  describe("createCustomHandlerMiddleware", () => {
    it("should create middleware that handles custom routes with /_ prefix", () => {
      const customHandlers = [
        new Handler("/api/test", "get", ({ request }) => {
          return HttpResponse.json({ message: "test", url: request.url });
        }),
      ];

      const middleware = createCustomHandlerMiddleware(customHandlers);

      const mockReq = {
        path: "/_/api/test",
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:6677"),
        originalUrl: "/_/api/test",
      };

      const mockRes = {
        header: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.header).toHaveBeenCalledWith({
        "Content-Type": "application/json",
      });
      expect(mockRes.send).toHaveBeenCalledWith(
        JSON.stringify({
          message: "test",
          url: "http://localhost:6677/_/api/test",
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next() when no custom handlers match", () => {
      const customHandlers = [
        new Handler("/api/test", "get", () =>
          HttpResponse.json({ message: "test" })
        ),
      ];

      const middleware = createCustomHandlerMiddleware(customHandlers);

      const mockReq = {
        path: "/_/api/other",
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:6677"),
        originalUrl: "/_/api/other",
      };

      const mockRes = {
        header: jest.fn(),
        send: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.header).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next() when path does not start with /_", () => {
      const customHandlers = [
        new Handler("/api/test", "get", () =>
          HttpResponse.json({ message: "test" })
        ),
      ];

      const middleware = createCustomHandlerMiddleware(customHandlers);

      const mockReq = {
        path: "/api/test",
        protocol: "http",
        get: jest.fn(),
        originalUrl: "/api/test",
      };

      const mockRes = {
        header: jest.fn(),
        send: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next() when no custom handlers provided", () => {
      const middleware = createCustomHandlerMiddleware();

      const mockReq = {
        path: "/_/api/test",
      };

      const mockRes = {
        header: jest.fn(),
        send: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle errors in custom handler callback", () => {
      const customHandlers = [
        new Handler("/api/error", "get", () => {
          throw new Error("Handler error");
        }),
      ];

      const middleware = createCustomHandlerMiddleware(customHandlers);

      const mockReq = {
        path: "/_/api/error",
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:6677"),
        originalUrl: "/_/api/error",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Custom handler failed",
        detail: "Handler error",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", () => {
      const customHandlers = [
        new Handler("/api/error", "get", () => {
          throw "String error";
        }),
      ];

      const middleware = createCustomHandlerMiddleware(customHandlers);

      const mockReq = {
        path: "/_/api/error",
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:6677"),
        originalUrl: "/_/api/error",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Custom handler failed",
        detail: "Unknown error",
      });
    });
  });

  describe("createPrismMiddleware", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        request: jest.fn(),
      };
    });

    it("should handle successful prism response", async () => {
      const mockPrismResponse = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        data: { message: "success" },
        violations: { input: [], output: [] },
      };

      mockClient.request.mockResolvedValue(mockPrismResponse);

      const middleware = createPrismMiddleware(mockClient);

      const mockReq = {
        url: "/api/users",
        method: "GET",
        path: "/api/users",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };

      await middleware(mockReq, mockRes);

      expect(mockClient.request).toHaveBeenCalledWith(
        "/api/users",
        { method: "get" },
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith({
        "Content-Type": "application/json",
      });
      expect(mockRes.send).toHaveBeenCalledWith({ message: "success" });
    });

    it("should handle prism response with violations", async () => {
      const mockPrismResponse = {
        violations: {
          input: [{ message: "Invalid input" }],
          output: [],
        },
      };

      mockClient.request.mockResolvedValue(mockPrismResponse);

      const middleware = createPrismMiddleware(mockClient);

      const mockReq = {
        url: "/api/users",
        method: "GET",
        path: "/api/users",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await middleware(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        violations: { input: [{ message: "Invalid input" }], output: [] },
      });
    });

    it("should handle prism client errors", async () => {
      const error = new Error("Prism error");
      mockClient.request.mockRejectedValue(error);

      const middleware = createPrismMiddleware(mockClient);

      const mockReq = {
        url: "/api/users",
        method: "GET",
        path: "/api/users",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // The middleware doesn't await the promise, so we need to wait for the next tick
      middleware(mockReq, mockRes);

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Mock failed",
        detail: "Prism error",
      });
    });

    it("should configure proxy for custom handler paths", async () => {
      const customHandlers = [
        new Handler("/api/custom", "get", () =>
          HttpResponse.json({ message: "custom" })
        ),
      ];

      const middleware = createPrismMiddleware(
        mockClient,
        customHandlers,
        8080
      );

      const mockReq = {
        url: "/api/custom",
        method: "GET",
        path: "/api/custom",
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };

      mockClient.request.mockResolvedValue({
        status: 200,
        headers: {},
        data: {},
        violations: { input: [], output: [] },
      });

      await middleware(mockReq, mockRes);

      expect(mockClient.request).toHaveBeenCalledWith(
        "/api/custom",
        { method: "get" },
        {
          isProxy: true,
          upstream: new URL("http://localhost:8080/_/"),
        }
      );
    });
  });
});
