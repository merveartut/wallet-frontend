import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type AlertKind = 'error' | 'success' | 'info';

export function Alert({ kind, children }: { kind: AlertKind; children: ReactNode }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Etiketli input; altında hata veya ipucu gösterir */
export function Field({ label, error, hint, id, ...inputProps }: FieldProps) {
  const inputId = id ?? inputProps.name;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-invalid={error ? true : undefined} {...inputProps} />
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function SelectField({ label, error, id, children, ...selectProps }: SelectFieldProps) {
  const selectId = id ?? selectProps.name;
  return (
    <div className="field">
      <label htmlFor={selectId}>{label}</label>
      <select id={selectId} aria-invalid={error ? true : undefined} {...selectProps}>
        {children}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={loading}>
      {loading ? 'Lütfen bekleyin…' : children}
    </button>
  );
}
