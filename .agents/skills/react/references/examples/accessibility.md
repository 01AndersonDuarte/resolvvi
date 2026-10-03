# Exemplos de acessibilidade

## Mensagem de carregamento

```tsx
function LoadingMessage() {
  return (
    <p role="status" aria-live="polite" aria-busy="true">
      Consultando a API...
    </p>
  )
}
```
