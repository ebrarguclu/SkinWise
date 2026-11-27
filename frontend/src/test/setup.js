// Runs before every test file.
// Adds matchers like toBeInTheDocument() and cleans the fake page between tests.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// Pass to <MemoryRouter future={routerFuture}> in tests to opt in to React Router v7
// behaviour early, which also hides its "future flag" warnings in the test output.
export const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }
