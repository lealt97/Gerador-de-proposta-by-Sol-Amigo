# Variáveis de ambiente — SolAmigo Propostas FV

Este documento define as variáveis permitidas e obrigatórias em desenvolvimento, homologação e produção.

## 1. Frontend Vite

As variáveis abaixo são incorporadas ao bundle durante o build. Elas são públicas por natureza e podem ser visualizadas pelo navegador.

| Variável | Obrigatória | Ambientes | Finalidade |
|---|---:|---|---|
| `VITE_SUPABASE_URL` | Sim | desenvolvimento, homologação e produção | URL base do projeto Supabase, sem `/rest/v1` no final. |
| `VITE_SUPABASE_ANON_KEY` | Sim | desenvolvimento, homologação e produção | Chave pública `anon` ou publishable do Supabase. |

### Regras de segurança

- Nunca use `SUPABASE_SERVICE_ROLE_KEY` em uma variável iniciada por `VITE_`.
- Nunca coloque segredos de pagamento, SMTP, administração ou banco no frontend.
- Homologação e produção devem usar projetos Supabase distintos.
- Ao alterar uma variável `VITE_*`, execute um novo build e deploy; mudar somente o runtime não altera um bundle já compilado.

## 2. Servidor de produção no Railway

| Variável | Obrigatória | Origem | Finalidade |
|---|---:|---|---|
| `PORT` | Automática | Railway | Porta usada pelo servidor Express. O Railway injeta esse valor em cada deployment. |
| `NODE_ENV` | Recomendada | Railway/configuração | Deve ser `production` no ambiente comercial. |

O processo de produção é iniciado por `npm start`, que executa `node server.mjs`. O endpoint `/health` deve responder HTTP 200 para o healthcheck do Railway.

## 3. Supabase Edge Function `public-proposal-pdf`

Estas variáveis pertencem somente ao ambiente protegido das Edge Functions.

| Variável | Obrigatória | Visibilidade | Finalidade |
|---|---:|---|---|
| `SUPABASE_URL` | Sim | servidor | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | segredo de servidor | Consulta a proposta e cria URL temporária para o PDF privado. |

A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser copiada para o Railway frontend, repositório, logs, navegador ou arquivo `.env` versionado.

## 4. Matriz de ambientes

| Ambiente | Supabase | Railway | Dados permitidos |
|---|---|---|---|
| Desenvolvimento | Projeto exclusivo de desenvolvimento | execução local | dados fictícios |
| Homologação | Projeto exclusivo de homologação | serviço/ambiente de staging | dados de teste controlados |
| Produção | Projeto exclusivo de produção | serviço/ambiente de produção | dados reais de clientes |

Cada ambiente deve possuir suas próprias URLs, chaves públicas, buckets, migrations aplicadas e configurações de autenticação.

## 5. Validação antes de publicar

1. Confirmar que `VITE_SUPABASE_URL` corresponde ao ambiente correto.
2. Confirmar que a chave é pública e não é `service_role`.
3. Executar `npm run build`.
4. Executar `npm start` e validar `GET /health`.
5. Confirmar login, MFA, geração de PDF e link público no ambiente publicado.
6. Verificar que nenhum segredo aparece no bundle, logs ou painel do navegador.
