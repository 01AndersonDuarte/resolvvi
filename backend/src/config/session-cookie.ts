export function readSessionSecret(header: string | undefined, name: string): string | null {
  const cookie = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1) ?? null;
}
