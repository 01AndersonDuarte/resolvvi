export function parseCsvRecords(content: string): string[][] {
  const state: CsvParserState = {
    records: [],
    record: [],
    field: '',
    inQuotes: false,
    quotedFieldClosed: false,
  };

  for (let index = 0; index < content.length; index += 1) index = consumeCharacter(content, index, state);

  if (state.inQuotes) throw new Error('CSV inválido: campo entre aspas não foi fechado');
  if (state.field.length > 0 || state.record.length > 0 || state.quotedFieldClosed) finishRecord(state);

  return state.records;
}

type CsvParserState = {
  records: string[][];
  record: string[];
  field: string;
  inQuotes: boolean;
  quotedFieldClosed: boolean;
};

function consumeCharacter(content: string, index: number, state: CsvParserState): number {
  const character = content[index];
  if (state.inQuotes) return consumeQuotedCharacter(content, index, state);
  if (state.quotedFieldClosed && character !== ',' && character !== '\r' && character !== '\n') {
    throw new Error('CSV inválido: conteúdo após o fechamento de aspas');
  }

  if (character === '"' && state.field.length === 0) {
    state.inQuotes = true;
    return index;
  }
  if (character === ',') return finishField(state, index);
  if (character === '\r' || character === '\n') return finishRecordAt(content, index, state);

  state.field += character;
  return index;
}

function consumeQuotedCharacter(content: string, index: number, state: CsvParserState): number {
  const character = content[index];
  if (character !== '"') {
    state.field += character;
    return index;
  }

  if (content[index + 1] === '"') {
    state.field += '"';
    return index + 1;
  }

  state.inQuotes = false;
  state.quotedFieldClosed = true;
  return index;
}

function finishField(state: CsvParserState, index: number): number {
  state.record.push(state.field);
  state.field = '';
  state.quotedFieldClosed = false;
  return index;
}

function finishRecordAt(content: string, index: number, state: CsvParserState): number {
  if (content[index] === '\r' && content[index + 1] === '\n') index += 1;
  finishRecord(state);
  return index;
}

function finishRecord(state: CsvParserState): void {
  state.records.push([...state.record, state.field]);
  state.record = [];
  state.field = '';
  state.quotedFieldClosed = false;
}
