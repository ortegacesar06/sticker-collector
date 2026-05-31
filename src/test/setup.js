import { cleanup } from '@testing-library/react'
import '@testing-library/user-event'
import { afterEach } from 'vitest'
import 'fake-indexeddb/auto'

afterEach(() => {
  cleanup()
})
