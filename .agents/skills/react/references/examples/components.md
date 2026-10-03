# Exemplos de componentes e props

## Exemplo de componente pequeno:

```tsx
type StatusCardProps = {
  status: 'online' | 'offline'
}

export function StatusCard({ status }: StatusCardProps) {
  const label = status === 'online' ? 'API online' : 'API offline'
  const color = status === 'online' ? 'text-green-700' : 'text-red-700'

  return (
    <section aria-label="Status da API" className="rounded-lg border p-4">
      <p className={color}>{label}</p>
    </section>
  )
}
```

## Exemplo de props explícitas

Evite encaminhar props com o spread operator, pois isso esconde a API do componente e pode repassar atributos inesperados:

```tsx
// Evite
function Button(props: ButtonProps) {
  return <button {...props} />
}
```

Declare e utilize as propriedades explicitamente:

```tsx
type ButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
    >
      {label}
    </button>
  )
}
```
