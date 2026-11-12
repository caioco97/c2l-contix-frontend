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
VITE_API_URL=http://localhost:5080/api/v1
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
    companies/    empresa ativa (seletor)
    home/         tela Início (calendário, notícias, documentos, CND)
    documents/    pastas, listagem, upload, download, exclusão, envio
    requests/     portal do cliente: catálogo, formulários por tipo, detalhe com histórico
    service-desk/ escritório: fila de atendimento das solicitações (rota /atendimento)
    news/ cnd/    APIs de notícias e certidões
  lib/            cliente Axios, query client, formatadores, utilitários
  mocks/          dados simulados usados enquanto a API não existe
  types/          tipos das telas (domain) e contratos da API (dto)
```

Cada feature tem um `api.ts` que chama a API real ou os mocks, conforme `VITE_USE_MOCKS`. As telas só conhecem essas funções, então trocar mock por API não exige mudar componentes.

## Autenticação

- `POST /auth/login` com `{ email, senha }` devolve `accessToken`, `accessTokenExpiraEm`, `refreshToken`, `refreshTokenExpiraEm` e `usuario`.
- O interceptor do Axios envia `Authorization: Bearer` e, em caso de `401`, chama `POST /auth/refresh` **uma única vez** para todas as requisições pendentes (fila single-flight) e repete a chamada original. O refresh é rotativo; se falhar, a sessão é encerrada e o usuário volta ao login.
- `GET /auth/me` restaura a sessão ao recarregar a página.

Com a API local (`docker compose up` no backend), use `cliente@contix.dev`, `colaborador@contix.dev` ou `admin@contix.dev` com a senha `Contix@123`.

## Integração com a API (`/api/v1`)

A API usa nomes em português; os DTOs estão em `src/types/dto.ts` e cada `api.ts` converte para os tipos das telas (`src/types/domain.ts`). A empresa ativa vai na rota (`/empresas/{id}/...`).

| Método | Rota | Uso | Status |
| --- | --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` · GET `/auth/me` | sessão | integrado |
| GET | `/empresas` | empresas do usuário (paginado) | integrado |
| GET | `/empresas/{id}/pastas` | árvore de pastas com `documentosNaoLidos` | integrado |
| GET | `/empresas/{id}/documentos?pastaId&busca&status&orderBy&desc&page&pageSize` | listagem | integrado |
| GET | `/empresas/{id}/documentos/vencimentos?inicio&fim` | calendário | integrado |
| POST | `/empresas/{id}/documentos` (multipart `pastaId`, `arquivos[]`, `comentario`, `dataVencimento`) | upload | integrado |
| GET | `/empresas/{id}/documentos/{docId}/download` · POST `/empresas/{id}/documentos/download` | download (zip se vários) | integrado |
| POST | `/empresas/{id}/documentos/{docId}/lido` | marcar como lido | integrado |
| DELETE | `/empresas/{id}/documentos/{docId}` | exclusão | integrado |
| GET | `/solicitacoes/tipos` | catálogo de tipos | integrado |
| GET · POST | `/empresas/{id}/solicitacoes` (multipart `tipo`, `assunto`, `departamento`, `descricao`, `dados` JSON, `anexos[]`) | minhas solicitações / abrir | integrado |
| GET | `/empresas/{id}/solicitacoes/{solId}` | detalhe com histórico e ações permitidas | integrado |
| POST | `/empresas/{id}/solicitacoes/{solId}/comentarios` · `/status` | conversa e mudança de status | integrado |
| PUT | `/empresas/{id}/solicitacoes/{solId}/atribuicao` | responsável e prazo (escritório) | integrado |
| GET | `/solicitacoes` | fila de atendimento do escritório | integrado |
| — | recuperação de senha, envio por e-mail, notícias, CND | | simulado até a API existir |

### Solicitações de serviço

- **Cliente** (`/portal`): escolhe o tipo no catálogo e preenche o formulário específico (cadastros de empregado/contribuinte/estagiário, férias, rescisão, afastamento, rubricas ou solicitação geral). A validação com Zod espelha a da API, e erros do servidor como `dados.cpf` aparecem no campo certo. Em "Minhas solicitações" acompanha o status, conversa com o escritório, anexa arquivos e pode cancelar.
- **Escritório** (`/atendimento`, só administradores e colaboradores): fila de todas as empresas, ordenada pelo prazo, com abas (minhas, sem responsável, aguardando cliente) e filtros por empresa, tipo, departamento, responsável e atrasadas. No detalhe, muda o status (pedir informação ao cliente exige mensagem), atribui responsável e prazo.

Erros seguem `ProblemDetails` (RFC 7807); a mensagem exibida vem de `errors`, `detail` ou `title`.
