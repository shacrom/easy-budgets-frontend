import { vi, type Mock } from 'vitest';

/**
 * Helper to create a mock object with specified methods
 * Replacement for jasmine.createSpyObj
 */
export function createMockObj<T>(methods: string[]): { [K in keyof T]?: Mock } & { [key: string]: Mock } {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock;
}

/**
 * Helper to create a chainable mock for Supabase query builders
 */
export function createChainableMock() {
  const mock: any = {};
  
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert', 
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'limit', 'range', 'or', 'and',
    'is', 'in', 'contains', 'containedBy',
    'single', 'maybeSingle'
  ];
  
  chainMethods.forEach(method => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });
  
  // Make it thenable
  mock._mockResponse = { data: [], error: null };
  mock.then = function(resolve: any, reject?: any) {
    return Promise.resolve(this._mockResponse).then(resolve, reject);
  };
  
  return mock;
}

/**
 * Sets the mock response for a chainable mock
 */
export function setMockResponse(mock: any, response: { data?: any; error?: any }) {
  mock._mockResponse = response;
}
