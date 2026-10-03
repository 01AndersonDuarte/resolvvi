# Exemplos de acesso ao backend

## Exemplo de módulo de acesso à API:

```ts
export type Health = { status: string }

export async function fetchHealth(): Promise<Health> {
  const response = await fetch('http://localhost:3000/health')
  if (!response.ok) throw new Error('Não foi possível consultar a API')
  return response.json() as Promise<Health>
}
```

## Exemplo de hook que contém a lógica de integração:

```tsx
export function useApiHealth() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .finally(() => setLoading(false))
  }, [])

  return { health, loading }
}
```
