import { api } from '@/lib/api'

/** Baixa um arquivo autenticado e devolve o blob com o nome indicado pelo servidor. */
export async function fetchFile(url: string, fallbackName = 'arquivo'): Promise<{ blob: Blob; fileName: string }> {
  const res = await api.get(url, { responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  const fileName = star ? decodeURIComponent(star[1]) : plain ? plain[1] : fallbackName
  return { blob: res.data as Blob, fileName }
}

export function saveFile({ blob, fileName }: { blob: Blob; fileName: string }) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
