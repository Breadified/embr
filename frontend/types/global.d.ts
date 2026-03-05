// Global TypeScript declarations for MCP Supabase functions and test environment

declare global {
  // MCP Supabase function declarations
  var mcp__supabase__execute_sql: (query: string) => Promise<{
    data: any[] | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__apply_migration: (name: string, query: string) => Promise<{
    data: any[] | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__list_tables: (schemas?: string[]) => Promise<{
    data: any[] | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__generate_typescript_types: () => Promise<{
    data: string | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__get_project_url: () => Promise<{
    data: string | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__get_anon_key: () => Promise<{
    data: string | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__get_logs: (service: string) => Promise<{
    data: any[] | null;
    error: { message: string; code?: string } | null;
  }>;
  
  var mcp__supabase__get_advisors: (type: 'security' | 'performance') => Promise<{
    data: any[] | null;
    error: { message: string; code?: string } | null;
  }>;
  
  // React Native global variables for testing
  var __DEV__: boolean;
  
  // Jest global functions
  var jest: any;
  var describe: any;
  var it: any;
  var expect: any;
  var beforeEach: any;
  var afterEach: any;
  var beforeAll: any;
  var afterAll: any;
}

export {};