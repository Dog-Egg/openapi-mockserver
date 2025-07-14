import { Handler, HttpResponse, http } from '../src/http';

describe('HttpResponse', () => {
  describe('constructor', () => {
    it('should create response with body and default headers', () => {
      const response = new HttpResponse('test body');
      
      expect(response.body).toBe('test body');
      expect(response.headers).toEqual({});
    });

    it('should create response with body and custom headers', () => {
      const headers = { 'Content-Type': 'text/plain' };
      const response = new HttpResponse('test body', headers);
      
      expect(response.body).toBe('test body');
      expect(response.headers).toBe(headers);
    });
  });

  describe('json static method', () => {
    it('should create JSON response with correct headers', () => {
      const data = { message: 'hello', count: 42 };
      const response = HttpResponse.json(data);
      
      expect(response.body).toBe(JSON.stringify(data));
      expect(response.headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('should handle null and undefined data', () => {
      const nullResponse = HttpResponse.json(null);
      const undefinedResponse = HttpResponse.json(undefined);
      
      expect(nullResponse.body).toBe('null');
      expect(undefinedResponse.body).toBe(undefined);
    });
  });
});

describe('Handler', () => {
  describe('constructor', () => {
    it('should create handler with path, method and callback', () => {
      const callback = jest.fn();
      const handler = new Handler('/test', 'get', callback);
      
      expect(handler.method).toBe('get');
      expect(handler.callback).toBe(callback);
    });
  });

  describe('match method', () => {
    it('should match exact paths', () => {
      const callback = jest.fn();
      const handler = new Handler('/api/users', 'get', callback);
      
      expect(handler.match('/api/users')).toBe(true);
      expect(handler.match('/api/users/')).toBe(false);
      expect(handler.match('/api/user')).toBe(false);
    });

    it('should match paths with parameters', () => {
      const callback = jest.fn();
      const handler = new Handler('/api/users/:id', 'get', callback);
      
      expect(handler.match('/api/users/123')).toBe(true);
      expect(handler.match('/api/users/abc')).toBe(true);
      expect(handler.match('/api/users/123/posts')).toBe(false);
      expect(handler.match('/api/users')).toBe(false);
    });

    it('should match complex paths with multiple parameters', () => {
      const callback = jest.fn();
      const handler = new Handler('/api/users/:userId/posts/:postId', 'get', callback);
      
      expect(handler.match('/api/users/123/posts/456')).toBe(true);
      expect(handler.match('/api/users/abc/posts/def')).toBe(true);
      expect(handler.match('/api/users/123/posts')).toBe(false);
      expect(handler.match('/api/users/123/posts/456/comments')).toBe(false);
    });

    it('should not match partial paths', () => {
      const callback = jest.fn();
      const handler = new Handler('/api', 'get', callback);
      
      expect(handler.match('/api')).toBe(true);
      expect(handler.match('/api/users')).toBe(false);
      expect(handler.match('/ap')).toBe(false);
    });
  });

  describe('callback execution', () => {
    it('should execute callback with request object', () => {
      const mockResponse = new HttpResponse('test response');
      const callback = jest.fn().mockReturnValue(mockResponse);
      const handler = new Handler('/test', 'get', callback);
      
      const request = { url: 'http://localhost:3000/test' };
      const result = handler.callback({ request });
      
      expect(callback).toHaveBeenCalledWith({ request });
      expect(result).toBe(mockResponse);
    });
  });
});

describe('http helper', () => {
  describe('get method', () => {
    it('should create GET handler', () => {
      const callback = jest.fn();
      const handler = http.get('/test', callback);
      
      expect(handler).toBeInstanceOf(Handler);
      expect(handler.method).toBe('get');
      expect(handler.callback).toBe(callback);
    });

    it('should create handler that matches the path', () => {
      const callback = jest.fn();
      const handler = http.get('/api/test', callback);
      
      expect(handler.match('/api/test')).toBe(true);
      expect(handler.match('/api/other')).toBe(false);
    });
  });
});

describe('pathToRegex function (internal)', () => {
  // Testing the internal pathToRegex function through Handler behavior
  it('should handle root path', () => {
    const callback = jest.fn();
    const handler = new Handler('/', 'get', callback);
    
    expect(handler.match('/')).toBe(true);
    expect(handler.match('/test')).toBe(false);
  });

  it('should handle paths with special regex characters', () => {
    const callback = jest.fn();
    const handler = new Handler('/api/test.json', 'get', callback);
    
    expect(handler.match('/api/test.json')).toBe(true);
    expect(handler.match('/api/testXjson')).toBe(false);
  });

  it('should handle nested paths with parameters', () => {
    const callback = jest.fn();
    const handler = new Handler('/api/:version/users/:id', 'get', callback);
    
    expect(handler.match('/api/v1/users/123')).toBe(true);
    expect(handler.match('/api/v2/users/abc')).toBe(true);
    expect(handler.match('/api/users/123')).toBe(false);
    expect(handler.match('/api/v1/users')).toBe(false);
  });
});
