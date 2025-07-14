// Jest setup file
// Add any global test setup here

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console.log to reduce noise in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});
