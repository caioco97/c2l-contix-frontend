/** Simula latência de rede nas chamadas mock. */
export function mockDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

export function mockError(status: number, title: string, ms = 350): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject({ isAxiosError: true, response: { status, data: { title, status } } }), ms),
  )
}
