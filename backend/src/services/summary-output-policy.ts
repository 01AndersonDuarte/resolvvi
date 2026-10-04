const MARKUP_OR_URL = /(?:<\/?[a-z][^>]*>|`{1,3}|\*{1,2}|_{1,2}|~~|https?:\/\/|www\.|^\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)|\|[^\n]*\|)/imu;
const DISALLOWED_CONTENT = /(?:^|[^\p{L}])(?:olá|oi|prezado|posso ajudar|sou uma inteligência artificial|como modelo de linguagem|instruç(?:ão|ões) (?:do sistema|internas)|prompt (?:interno|original)|recomendo|recomenda-se|você deve|procure um advogado|entre com recurso|conte o prazo|o prazo termina|a chance de êxito|provavelmente vencerá)(?=$|[^\p{L}])/iu;

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
}

export function containsDisallowedSummaryText(value: string): boolean {
  return hasControlCharacters(value) || MARKUP_OR_URL.test(value) || DISALLOWED_CONTENT.test(value);
}

export function hasInternalLineBreak(value: string): boolean {
  return /[\r\n]/u.test(value);
}
