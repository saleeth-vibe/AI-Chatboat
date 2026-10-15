type TextFieldProps = {
  label: string;
  name: string;
  type: 'email' | 'password' | 'text' | 'date';
  autoComplete?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
};

export function TextField({
  label,
  name,
  type,
  autoComplete = 'off',
  error,
  required = true,
  defaultValue,
  maxLength,
}: TextFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
