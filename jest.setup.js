// Jest setup file for global test configuration

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      responses: {
        create: jest.fn().mockResolvedValue({
          id: 'test-response-id',
          status: 'completed',
          output: 'Test output',
          toStream: jest.fn(async function* () {
            yield { delta: { text: 'Test streaming content' } }
            yield { type: 'response.completed', response: { output: 'Final content' } }
          })
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'test-response-id',
          status: 'completed',
          output: 'Test output'
        }),
        cancel: jest.fn().mockResolvedValue({ success: true })
      }
    }))
  }
})

// Mock database connection
jest.mock('@/lib/db/connection', () => ({
  db: {
    query: {
      outlineSessions: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      workflows: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({})
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({})
      })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      })
    })
  }
}))

// Global test utilities
global.TestHelpers = {
  // Create a mock SSE response
  createMockSSEResponse: () => ({
    write: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn()
  }),
  
  // Create a mock workflow
  createMockWorkflow: (overrides = {}) => ({
    id: 'test-workflow-123',
    userId: 'test-user-123',
    clientId: 'test-client-123',
    title: 'Test Workflow',
    status: 'active',
    content: { steps: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  // Create a mock outline session
  createMockOutlineSession: (overrides = {}) => ({
    id: 'test-session-123',
    workflowId: 'test-workflow-123',
    version: 1,
    stepId: 'deep-research',
    status: 'pending',
    isActive: false,
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
}

// Suppress console logs during tests unless explicitly needed
const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn()
    console.error = jest.fn()
    console.warn = jest.fn()
  }
})

afterEach(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  }
})