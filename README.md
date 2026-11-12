# Contix — Frontend

Portal web do **Contix**, plataforma que conecta escritórios de contabilidade aos seus clientes: documentos por pasta, calendário de vencimentos, notícias, CND e solicitações de serviço.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query · React Hook Form + Zod · Axios · Lucide

## Como rodar

```bash
npm install
npm run dev          # http://localhost:5173
```

Por padrão o app roda com **dados simulados** (`VITE_USE_MOCKS=true`), sem precisar da API. Entre com qualquer e-mail e a senha `123456`.

Para usar a API .NET, crie um `.env.development.local`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_USE_MOCKS=false
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run lint` | lint com oxlint |
| `npm run preview` | serve o build localmente |

### Docker

```bash
docker build -t contix-web .
docker run -p 8080:80 contix-web
```

A imagem usa nginx, serve o SPA e faz proxy de `/api/` para o serviço `api:8080` (ver `nginx.conf`), pensada para o `docker compose` junto do backend.

## Estrutura

```
src/
  app/            providers, rotas, páginas globais
  components/
    ui/           biblioteca base (Button, Input, Select, Modal, Table, Tabs, Card, Calendar, Toast…)
    layout/       cabeçalho, layout autenticado, logo
  config/         variáveis de ambiente
  features/       módulos por domínio
    auth/         login, recuperação de senha, sessão, rotas protegidas
    companies/    empresa ativa (seletor + header X-Company-Id)
    home/         tela Início (calendário, notícias, documentos, CND)
    documents/    pastas, listagem, upload, download, exclusão, envio
    requests/     portal do cliente: catálogo e solicitações
    news/ cnd/    APIs de notícias e certidões
  lib/            cliente Axios, query client, formatadores, utilitários
  mocks/          dados simulados usados enquanto a API não existe
  types/          contratos (DTOs) compartilhados com a API
```

Cada feature tem um `api.ts` que chama a API real ou os mocks, conforme `VITE_USE_MOCKS`. As telas só conhecem essas funções, então trocar mock por API não exige mudar componentes.

## Autenticação

- `POST /auth/login` devolve `accessToken`, `refreshToken`, `expiresAt` e `user`.
- O interceptor do Axios envia `Authorization: Bearer` e, em caso de `401`, chama `POST /auth/refresh` **uma única vez** para todas as requisições pendentes (fila single-flight) e repete a chamada original. Se o refresh falhar, a sessão é encerrada e o usuário volta ao login.
- `GET /auth/me` restaura a sessão ao recarregar a página.
- A empresa ativa vai no header `X-Company-Id`.

## Contrato esperado da API (`/api/v1`)

| Método | Rota | Uso |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | sessão |
| GET | `/auth/me` | usuário logado |
| POST | `/auth/forgot-password`, `/auth/reset-password` | recuperação de senha |
| GET | `/me/companies` | empresas do usuário |
| GET | `/companies/{id}/folders` | árvore de pastas com `unreadCount` |
| GET | `/companies/{id}/documents?folderId&filter&search&sortBy&sortDir&page&pageSize` | listagem paginada |
| GET | `/companies/{id}/documents/due?month=yyyy-MM` | vencimentos do mês |
| POST | `/companies/{id}/folders/{folderId}/documents` | upload (multipart) |
| POST | `/companies/{id}/documents/download` | download (zip se vários) |
| DELETE | `/companies/{id}/documents` | exclusão em lote |
| POST | `/companies/{id}/documents/send` | envio por e-mail |
| GET | `/companies/{id}/news?read=` · POST `/news/{id}/read` | notícias |
| GET | `/companies/{id}/cnds` | certidões |
| GET | `/companies/{id}/request-types` · GET/POST `/companies/{id}/requests` | solicitações |

Erros seguem `ProblemDetails` (RFC 7807); a mensagem exibida vem de `errors`, `detail` ou `title`. Os tipos estão em `src/types/`.
