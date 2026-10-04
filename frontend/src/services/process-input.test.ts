import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProcessInput, readProcessInput, saveProcessInput } from './process-input';

const FIRST_SESSION = 'session-one';
const SECOND_SESSION = 'session-two';
const CNJ = '1001399-31.2023.8.26.0070';

beforeEach(() => window.sessionStorage.clear());

describe('process input storage', () => {
  it('retains the search input only for the validated session', () => {
    saveProcessInput(FIRST_SESSION, CNJ);

    expect(readProcessInput(FIRST_SESSION)).toBe(CNJ);
    expect(readProcessInput(SECOND_SESSION)).toBe('');
    expect(window.sessionStorage.getItem(`process.cnj.${FIRST_SESSION}`)).toBeNull();
  });

  it('clears the active session input after logout', () => {
    saveProcessInput(FIRST_SESSION, CNJ);

    clearProcessInput();

    expect(window.sessionStorage.length).toBe(0);
  });

  it('leaves the empty storage unchanged when there is no active session', () => {
    clearProcessInput();

    expect(window.sessionStorage.length).toBe(0);
  });

  it('keeps search usable when browser storage rejects access', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });

    expect(readProcessInput(FIRST_SESSION)).toBe('');
    expect(saveProcessInput(FIRST_SESSION, CNJ)).toBeUndefined();
    expect(clearProcessInput()).toBeUndefined();

  });

  it('ignores browser storage write and cleanup failures', () => {
    saveProcessInput(FIRST_SESSION, CNJ);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(saveProcessInput(SECOND_SESSION, CNJ)).toBeUndefined();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readProcessInput(FIRST_SESSION)).toBe('');
    expect(clearProcessInput()).toBeUndefined();
  });
});
