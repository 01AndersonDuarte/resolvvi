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
```
