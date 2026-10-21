"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

export interface ColorComboboxProps {
  /** The currently selected (or freely typed) color name. */
  value: string;
  onChange: (value: string) => void;
  /** Known colors to choose from, e.g. from `getUniqueColors()`. */
  options: string[];
  id?: string;
  placeholder?: string;
  required?: boolean;
}

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";

/**
 * Creatable color combobox: pick an existing color from `options`, or type
 * a new one and confirm "Crear nuevo color" to use it as-is.
 *
 * Replaces a free `<input type="text">` for color fields so the admin is
 * steered towards reusing an existing spelling ("Marrón") instead of
 * accidentally typing a casing/accent variant ("marron") that fragments
 * the catalog color filter — see `src/lib/colorName.ts` for the
 * normalization applied server-side as a second line of defense.
 *
 * Built from scratch with plain Tailwind + ARIA attributes (no combobox
 * library installed in this project), following the WAI-ARIA 1.2
 * "combobox with list autocomplete" pattern: the text input owns
 * `role="combobox"`, the popup owns `role="listbox"`, and
 * `aria-activedescendant` tracks the highlighted option for screen readers.
 */
export function ColorCombobox({ value, onChange, options, id, placeholder, required }: ColorComboboxProps) {
  const [inputValue, setInputValue] = useState(value);
  // Tracks the last `value` prop seen, so a prop change can be detected and
  // applied during render (see below) instead of via a setState-in-effect,
  // which would cost an extra render pass.
  const [prevValue, setPrevValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id ?? "color-combobox"}-listbox`;

  // Keeps the input in sync if the parent ever reassigns `value` from the
  // outside (e.g. resetting the form) rather than through `onChange` here.
  // Adjusting state during render (the React-recommended pattern for this)
  // instead of in a `useEffect`, which would trigger an extra, avoidable
  // render after the one caused by the prop change itself.
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
  }

  const normalizedInput = inputValue.trim().toLowerCase();

  const filteredOptions = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(normalizedInput)),
    [options, normalizedInput],
  );

  // An exact (case-insensitive) match means the typed text is already a
  // known color — no "create new" row needed in that case.
  const hasExactMatch = options.some((option) => option.toLowerCase() === normalizedInput);
  const canCreate = inputValue.trim().length > 0 && !hasExactMatch;

  // Combined row count the keyboard navigates through: known matches first,
  // then the synthetic "create new" row (if applicable).
  const totalRows = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function commitValue(nextValue: string): void {
    setInputValue(nextValue);
    onChange(nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        setIsOpen(true);
        setHighlightedIndex(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(totalRows - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex < filteredOptions.length) {
        commitValue(filteredOptions[highlightedIndex]);
      } else if (canCreate) {
        commitValue(inputValue.trim());
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && totalRows > 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          required={required}
          value={inputValue}
          placeholder={placeholder}
          onChange={(event) => {
            setInputValue(event.target.value);
            onChange(event.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`${INPUT_CLASS} pr-8`}
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cairo-text/40" />
      </div>

      {isOpen && totalRows > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-cairo-text/10 bg-cairo-bg py-1 shadow-lg"
        >
          {filteredOptions.map((option, index) => {
            const isHighlighted = index === highlightedIndex;
            const isSelected = option.toLowerCase() === normalizedInput;

            return (
              <li
                key={option}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                // `onMouseDown` (not `onClick`) so this commits before the
                // input's blur/click-outside handler would otherwise close
                // the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitValue(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                  isHighlighted ? "bg-cairo-primary/10 text-cairo-primary" : "text-cairo-text"
                }`}
              >
                {option}
                {isSelected && <Check className="h-4 w-4" />}
              </li>
            );
          })}

          {canCreate && (
            <li
              id={`${listboxId}-option-${filteredOptions.length}`}
              role="option"
              aria-selected={false}
              onMouseDown={(event) => {
                event.preventDefault();
                commitValue(inputValue.trim());
              }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              className={`flex items-center gap-1.5 border-t border-cairo-text/10 px-3 py-2 text-sm font-medium ${
                highlightedIndex === filteredOptions.length
                  ? "bg-cairo-primary/10 text-cairo-primary"
                  : "text-cairo-primary/80"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Crear nuevo color &quot;{inputValue.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
