# @dogegg/openapi-mockserver

A lightweight and flexible OpenAPI mock server that generates realistic mock responses based on your OpenAPI specifications, with support for custom handlers.

## Installation

```bash
npm install @dogegg/openapi-mockserver
```

## Quick Start

### CLI Usage

Start a mock server with your OpenAPI specification:

```bash
npx @dogegg/openapi-mockserver start http://example.com/openapi.json
```

The server will start on `http://localhost:6677` and automatically generate mock responses for all endpoints defined in your OpenAPI spec.

### With Custom Handlers

Create a custom handlers file (`handlers.js`):

```javascript
const { http, HttpResponse } = require('@dogegg/openapi-mockserver');

module.exports = [
  http.get('/api/users/:id', ({ request }) => {
    const userId = request.url.split('/').pop();
    return HttpResponse.json({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      customField: 'This is a custom response!'
    });
  }),

  http.get('/api/health', () => {
    return HttpResponse.json({
        status: 'ok', 
        timestamp: Date.now() 
    });
  })
];
```

Start the server with custom handlers:

```bash
npx @dogegg/openapi-mockserver start --handlers ./handlers.js http://example.com/openapi.json
```
