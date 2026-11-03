import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

export interface CurrencyInputProps {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  allowDecimal?: boolean;
}

export const formatRupiahString = (
  num: number | null | undefined,
  allowDecimal: boolean = false
): string => {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '';
  const hasFraction = allowDecimal && Math.abs(num % 1) > 0.0001;
  return (
    'Rp ' +
    new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: 2,
    }).format(num)
  );
};

export const parseRupiahNumber = (str: string, allowDecimal: boolean = false): number => {
  if (!str) return 0;
  if (!allowDecimal) {
    const clean = str.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  }
  const clean = str.replace(/[^\d,.]/g, '');
  if (!clean) return 0;

  let intStr = '';
  let decStr = '';
  if (clean.includes(',')) {
    const parts = clean.split(',');
    intStr = parts[0].replace(/\D/g, '');
    decStr = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
  } else {
    // Check if it's a raw decimal string with a single dot and 1-2 digits at the end (e.g. "24.5" or "24.50")
    // and no other dots (not a formatted string like "20.000")
    const dotParts = clean.split('.');
    if (dotParts.length === 2 && dotParts[1].length > 0 && dotParts[1].length <= 2) {
      intStr = dotParts[0].replace(/\D/g, '');
      decStr = dotParts[1].replace(/\D/g, '');
    } else {
      intStr = clean.replace(/\D/g, '');
    }
  }

  const intNum = intStr ? parseInt(intStr, 10) : 0;
  const decNum = decStr ? parseFloat('0.' + decStr) : 0;
  return intNum + decNum;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = 'Contoh: Rp 1.000.000',
  className = '',
  required = false,
  disabled = false,
  min,
  max,
  id,
  name,
  autoFocus = false,
  allowDecimal = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const numValue =
    typeof value === 'string'
      ? parseRupiahNumber(value, allowDecimal)
      : typeof value === 'number' && !isNaN(value)
      ? value
      : 0;

  const [localText, setLocalText] = useState<string>(() =>
    numValue > 0 ? formatRupiahString(numValue, allowDecimal) : ''
  );

  useEffect(() => {
    const currentNum = parseRupiahNumber(localText, allowDecimal);
    if (Math.abs(currentNum - numValue) > 0.001) {
      setLocalText(numValue > 0 ? formatRupiahString(numValue, allowDecimal) : '');
    }
  }, [numValue, allowDecimal]);

  useLayoutEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      const pos = Math.min(cursorRef.current, inputRef.current.value.length);
      inputRef.current.setSelectionRange(pos, pos);
      cursorRef.current = null;
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const oldCursorPos = e.target.selectionEnd || rawInput.length;
    const offsetFromRight = rawInput.length - oldCursorPos;

    if (!allowDecimal) {
      const clean = rawInput.replace(/\D/g, '');
      const parsed = clean ? parseInt(clean, 10) : 0;
      let finalValue = parsed;
      if (max !== undefined && finalValue > max) finalValue = max;
      if (min !== undefined && finalValue < min && finalValue !== 0) finalValue = min;

      const nextFormatted = finalValue > 0 ? formatRupiahString(finalValue, false) : '';
      let newCursorPos = nextFormatted.length - offsetFromRight;
      if (newCursorPos < 3 && nextFormatted.length >= 3) newCursorPos = 3;
      if (newCursorPos > nextFormatted.length) newCursorPos = nextFormatted.length;

      cursorRef.current = newCursorPos;
      setLocalText(nextFormatted);
      onChange(finalValue);
      return;
    }

    // Decimal mode
    let cleanInput = rawInput;
    if (!cleanInput.includes(',') && cleanInput.includes('.')) {
      const lastDotIndex = cleanInput.lastIndexOf('.');
      const afterDot = cleanInput.slice(lastDotIndex + 1);
      if (afterDot.length <= 2 && !/^\d{3}$/.test(afterDot)) {
        cleanInput = cleanInput.slice(0, lastDotIndex) + ',' + afterDot;
      }
    }

    const clean = cleanInput.replace(/[^\d,.]/g, '');
    if (!clean) {
      cursorRef.current = 0;
      setLocalText('');
      onChange(0);
      return;
    }

    let intPart = '';
    let decPart = '';
    let hasComma = false;

    if (cleanInput.includes(',')) {
      const parts = cleanInput.split(',');
      intPart = parts[0].replace(/\D/g, '');
      decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
      hasComma = true;
    } else {
      intPart = cleanInput.replace(/\D/g, '');
    }

    const intNum = intPart ? parseInt(intPart, 10) : 0;
    const decNum = decPart ? parseFloat('0.' + decPart) : 0;
    let finalValue = intNum + decNum;
    if (max !== undefined && finalValue > max) finalValue = max;
    if (min !== undefined && finalValue < min && finalValue !== 0) finalValue = min;

    const formattedInt = intNum > 0 ? intNum.toLocaleString('id-ID') : hasComma ? '0' : '';
    const nextFormatted = hasComma
      ? `Rp ${formattedInt},${decPart}`
      : formattedInt
      ? `Rp ${formattedInt}`
      : '';

    let newCursorPos = nextFormatted.length - offsetFromRight;
    if (newCursorPos < 3 && nextFormatted.length >= 3) newCursorPos = 3;
    if (newCursorPos > nextFormatted.length) newCursorPos = nextFormatted.length;

    cursorRef.current = newCursorPos;
    setLocalText(nextFormatted);
    onChange(finalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allowDecimal && (e.key === '.' || e.key === 'Decimal')) {
      if (!localText.includes(',')) {
        e.preventDefault();
        const input = inputRef.current;
        if (input) {
          const pos = input.selectionStart ?? localText.length;
          const newText = localText.slice(0, pos) + ',' + localText.slice(input.selectionEnd ?? pos);
          const syntheticEvent = {
            target: { value: newText, selectionEnd: pos + 1 },
          } as React.ChangeEvent<HTMLInputElement>;
          handleChange(syntheticEvent);
        }
      }
    }
  };

  const handleBlur = () => {
    if (numValue > 0) {
      setLocalText(formatRupiahString(numValue, allowDecimal));
    } else {
      setLocalText('');
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      id={id}
      name={name}
      value={localText}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
    />
  );
};
