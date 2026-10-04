# Frontend

Aplicação React 19 com TypeScript, Vite, Tailwind CSS e React Router. A API é acessada pela mesma origem em `/api`; em desenvolvimento, o Vite encaminha esse caminho para `VITE_API_PROXY_TARGET` (padrão `http://localhost:3000`).

## Desenvolvimento

Copie `.env.development.example` para `.env.development.local` se precisar apontar para outro backend. Em seguida, execute:

```bash
npm install
npm run dev
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run test:e2e
```

As jornadas Playwright requerem a base `dev_test_resolvvi_e2e_test`, com migrations e fixture inicial carregadas conforme [`backend/README.md`](../backend/README.md#jornadas-e2e). A suíte inicia API, SPA e um endpoint de controle restrito a loopback para expiração de sessão.
