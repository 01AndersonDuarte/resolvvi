# Exemplos de hooks, efeitos e memoização

## Evite um efeito desnecessário:

```tsx
// Evite: o valor pode ser calculado durante a renderização
useEffect(() => {
  setFullName(`${firstName} ${lastName}`)
}, [firstName, lastName])
```

Prefira:

```tsx
const fullName = `${firstName} ${lastName}`
```

## Memoização

```tsx
const filteredUsers = useMemo(
  () => users.filter((user) => user.name.includes(searchTerm)),
  [users, searchTerm],
)
```
