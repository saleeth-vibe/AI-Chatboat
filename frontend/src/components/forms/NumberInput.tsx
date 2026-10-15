import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes } from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode' | 'min' | 'max'> & {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
};

export function parseBoundedInt(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function rangeMessage(value: string, min: number, max: number): string {
  if (value === '') {
    return '';
  }
  return parseBoundedInt(value, min, max) === null ? `Enter a whole number from ${min} to ${max}.` : '';
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, min, max, required, onBlur, ...props },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    inputRef.current?.setCustomValidity(rangeMessage(value, min, max));
  }, [max, min, value]);

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== '' && !/^\d+$/.test(next)) {
          return;
        }
        event.target.setCustomValidity(rangeMessage(next, min, max));
        onChange(next);
      }}
      onBlur={(event) => {
        if (/^\d+$/.test(value)) {
          const normalized = String(Number(value));
          if (normalized !== value) {
            onChange(normalized);
          }
        }
        onBlur?.(event);
      }}
    />
  );
});
