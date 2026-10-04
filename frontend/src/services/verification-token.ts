export function captureVerificationToken(location: Location, history: History): string | null {
  if (location.pathname !== '/confirmar-email') return null;

  const parameters = new URLSearchParams(location.hash.slice(1));
  const token = parameters.get('token');
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);

  return token === null || token.length === 0 ? null : token;
}
