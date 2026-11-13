export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5080/api/v1',
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
} as const
