import request from 'supertest';
import path from 'path';
import { Handler, HttpResponse } from '../src/http';
import { createApp, matchHandler } from '../src/server';

describe('Server App Tests', () => {
  const testOpenapiPath = path.join(__dirname, 'fixtures', 'test-openapi.json');

  describe('createApp function', () => {
    it('should create Express app with default port', async () => {
      const { app, port } = await createApp({ openapiUrl: testOpenapiPath });
      
      expect(app).toBeDefined();
      expect(port).toBe(6677);
    });

    it('should create Express app with custom port', async () => {
      const customPort = 8080;
      const { app, port } = await createApp({ 
        openapiUrl: testOpenapiPath, 
        port: customPort 
      });
      
      expect(app).toBeDefined();
      expect(port).toBe(customPort);
    });

    it('should create Express app with custom handlers', async () => {
      const customHandlers = [
        new Handler('/test', 'get', () => HttpResponse.json({ message: 'test' }))
      ];
      
      const { app, port } = await createApp({ 
        openapiUrl: testOpenapiPath, 
        customHandlers 
      });
      
      expect(app).toBeDefined();
      expect(port).toBe(6677);
    });
  });

  describe('Express app behavior', () => {
    let app: any;

    beforeAll(async () => {
      const customHandlers = [
        new Handler('/api/custom', 'get', ({ request }) => {
          return HttpResponse.json({ 
            message: 'custom response',
            url: request.url 
          });
        })
      ];
      
      const result = await createApp({ 
        openapiUrl: testOpenapiPath, 
        customHandlers 
      });
      app = result.app;
    });

    it('should handle custom routes with /_ prefix', async () => {
      const response = await request(app)
        .get('/_/api/custom')
        .expect(200);
      
      expect(response.body).toEqual({
        message: 'custom response',
        url: expect.stringContaining('/_/api/custom')
      });
    });

    it('should handle OpenAPI routes', async () => {
      // This will be handled by Prism mock server
      const response = await request(app)
        .get('/users')
        .expect((res) => {
          // We expect either a successful mock response or a specific error
          expect([200, 400, 500]).toContain(res.status);
        });
    });

    it('should return 500 for invalid routes', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Mock failed');
    });
  });

  describe('matchHandler function', () => {
    it('should return matching handler', () => {
      const handler1 = new Handler('/api/users', 'get', () => HttpResponse.json({}));
      const handler2 = new Handler('/api/posts', 'get', () => HttpResponse.json({}));
      const handlers = [handler1, handler2];

      const result = matchHandler('/api/users', handlers);
      expect(result).toBe(handler1);
    });

    it('should return first matching handler', () => {
      const handler1 = new Handler('/api/:resource', 'get', () => 
        HttpResponse.json({ type: 'first' })
      );
      const handler2 = new Handler('/api/users', 'get', () => 
        HttpResponse.json({ type: 'second' })
      );
      const handlers = [handler1, handler2];

      const result = matchHandler('/api/users', handlers);
      expect(result).toBe(handler1); // First match wins
    });

    it('should return null when no handler matches', () => {
      const handler1 = new Handler('/api/users', 'get', () => HttpResponse.json({}));
      const handler2 = new Handler('/api/posts', 'get', () => HttpResponse.json({}));
      const handlers = [handler1, handler2];

      const result = matchHandler('/api/comments', handlers);
      expect(result).toBeNull();
    });

    it('should return null for empty handlers array', () => {
      const result = matchHandler('/api/users', []);
      expect(result).toBeNull();
    });
  });

  describe('Custom handler middleware logic', () => {
    it('should match custom handler path correctly', () => {
      const customHandler = new Handler('/api/test', 'get', ({ request }) => {
        return HttpResponse.json({ 
          message: 'custom response',
          url: request.url 
        });
      });

      // Simulate the custom handler logic
      const requestPath = '/_/api/test';
      const match = requestPath.match(/^\/_(\/.+)/);
      
      expect(match).toBeTruthy();
      expect(match![1]).toBe('/api/test');
      
      if (match && customHandler.match(match[1])) {
        const response = customHandler.callback({
          request: { url: 'http://localhost:6677/_/api/test' }
        });
        
        expect(response.body).toBe(JSON.stringify({
          message: 'custom response',
          url: 'http://localhost:6677/_/api/test'
        }));
      }
    });

    it('should not match custom routes without /_ prefix', () => {
      const requestPath = '/api/test';
      const match = requestPath.match(/^\/_(\/.+)/);
      
      expect(match).toBeNull();
    });
  });
});
