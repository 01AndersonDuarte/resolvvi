import { useCallback, useRef, useState } from 'react';
import { validateCredentials, validateEmail } from '../services/auth-validation';
import type { CredentialErrors } from '../services/auth-validation';
import type { AuthCredentials } from '../types/auth-credentials';
import type { RequestFailure } from '../types/api';

const EMPTY_ERRORS: CredentialErrors = { email: null, password: null };

export function useCredentialFields(mode: 'login' | 'registration', initialEmail = '') {
  const [email, setEmailValue] = useState(initialEmail);
  const [password, setPasswordValue] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>(EMPTY_ERRORS);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const setEmail = useCallback((value: string) => updateField(value, setEmailValue, setErrors, 'email'), []);
  const setPassword = useCallback((value: string) => updateField(value, setPasswordValue, setErrors, 'password'), []);
  const clearPassword = useCallback(() => setPasswordValue(''), []);
  const validate = useCallback((): AuthCredentials | null => {
    const result = validateCredentials(email, password, mode);
    setErrors(result.errors);
    if (result.input !== null) setEmailValue(result.input.email);
    focusCredentialError(result.errors, emailRef.current, passwordRef.current);

    return result.input;
  }, [email, mode, password]);
  const applyFailure = useCallback((failure: RequestFailure | null) => {
    applyCredentialFailure(failure, setErrors, emailRef.current, passwordRef.current);
  }, []);

  return { email, password, errors, emailRef, passwordRef, setEmail, setPassword, clearPassword, validate, applyFailure };
}

export function useEmailField(initialEmail = '') {
  const [email, setEmailValue] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setEmail = useCallback((value: string) => { setEmailValue(value); setError(null); }, []);
  const validate = useCallback((): string | null => {
    const result = validateEmail(email);
    setError(result.error);
    if (result.email !== null) setEmailValue(result.email);
    if (result.error !== null) inputRef.current?.focus();

    return result.email;
  }, [email]);
  const applyFailure = useCallback((failure: RequestFailure | null) => {
    if (failure?.error.field !== 'email') return;
    setError(failure.error.message);
    inputRef.current?.focus();
  }, []);

  return { email, error, inputRef, setEmail, validate, applyFailure };
}

function updateField(
  value: string,
  setter: (value: string) => void,
  setErrors: (update: (current: CredentialErrors) => CredentialErrors) => void,
  field: keyof CredentialErrors,
): void {
  setter(value);
  setErrors((current) => ({ ...current, [field]: null }));
}

function focusCredentialError(
  errors: CredentialErrors,
  email: HTMLInputElement | null,
  password: HTMLInputElement | null,
): void {
  if (errors.email !== null) email?.focus();
  else if (errors.password !== null) password?.focus();
}

function applyCredentialFailure(
  failure: RequestFailure | null,
  setErrors: (update: (current: CredentialErrors) => CredentialErrors) => void,
  email: HTMLInputElement | null,
  password: HTMLInputElement | null,
): void {
  const field = failure?.error.field;
  const message = failure?.error.message;
  if (field !== 'email' && field !== 'password') return;
  if (message === undefined) return;
  setErrors((current) => ({ ...current, [field]: message }));
  if (field === 'email') email?.focus();
  else password?.focus();
}
