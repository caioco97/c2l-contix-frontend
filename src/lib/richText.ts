import DOMPurify from 'dompurify'

/**
 * Conteúdo rico (HTML) das notícias. O backend já sanitiza, mas o portal sanitiza de novo antes de renderizar.
 * Notícias antigas em texto simples (parágrafos separados por linha em branco) são convertidas para HTML.
 */

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote']
const SAFE_LINK = /^(https?:|mailto:|tel:)/i

let hooked = false
function ensureHooks() {
  if (hooked) return
  hooked = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return
    const href = node.getAttribute('href') ?? ''
    if (!SAFE_LINK.test(href.trim())) {
      node.removeAttribute('href')
      return
    }
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  })
}

/** O conteúdo veio do editor (HTML) ou é texto simples antigo? */
export function isHtml(content: string | null | undefined): boolean {
  return !!content && /^\s*<(p|h[1-6]|ul|ol|blockquote|div|br)[\s/>]/i.test(content)
}

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Texto simples → parágrafos HTML (quebras simples viram <br>). */
export function textToHtml(text: string): string {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.split(/\r?\n/).map(escape).join('<br>')}</p>`)
    .join('')
}

/** HTML pronto para o editor: texto antigo vira parágrafos, HTML segue como está. */
export function toEditorHtml(content: string | null | undefined): string {
  if (!content?.trim()) return ''
  return isHtml(content) ? content : textToHtml(content)
}

/** HTML seguro para renderizar com dangerouslySetInnerHTML. */
export function toSafeHtml(content: string | null | undefined): string {
  ensureHooks()
  return DOMPurify.sanitize(toEditorHtml(content), { ALLOWED_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] })
}

/** Texto puro do conteúdo, para validar se há texto e gerar resumos. */
export function htmlToText(content: string | null | undefined): string {
  if (!content) return ''
  if (!isHtml(content)) return content.trim()
  const doc = new DOMParser().parseFromString(content.replace(/<\s*(br|\/p|\/h[1-6]|\/li|\/blockquote)\s*\/?>/gi, ' $&'), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
