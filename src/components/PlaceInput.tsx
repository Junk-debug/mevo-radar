import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { searchPlaces, type Place } from "../lib/geocode";
import type { LatLon } from "../lib/geo";

export interface PlaceValue {
  label: string;
  coords: LatLon;
}

interface Props {
  label: string;
  marker: "from" | "to";
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;
  onFocus?: () => void;
  withLocate?: boolean;
}

export function PlaceInput({ label, marker, value, onChange, onFocus, withLocate }: Props) {
  const { t, lang } = useI18n();
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef(false);

  // Show the chosen place's name; while the user types a new one (value cleared), keep their text.
  useEffect(() => {
    if (value) typed.current = false;
    if (value || !typed.current) setText(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    if (!typed.current || text.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(text.trim(), lang, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, lang]);

  const choose = (p: Place) => {
    typed.current = false;
    onChange({ label: p.label, coords: p.coords });
    setOpen(false);
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => onChange({ label: t("myLocation"), coords: [pos.coords.latitude, pos.coords.longitude] }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );

  return (
    <div className="place">
      <span className={`place-dot place-dot-${marker}`} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        value={text}
        placeholder={`${label} — ${t("placePlaceholder").toLowerCase()}`}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        onFocus={onFocus}
        onChange={(e) => {
          typed.current = true;
          setText(e.target.value);
          if (value) onChange(null); // the old coordinates no longer match the text
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter") choose(results[active]);
          else if (e.key === "Escape") setOpen(false);
          else return;
          e.preventDefault();
        }}
      />
      {withLocate && (
        <button type="button" className="icon-btn" onClick={locate} title={t("useMyLocation")} aria-label={t("useMyLocation")}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      )}
      {open && results.length > 0 && (
        <ul className="suggestions" id={`${id}-list`} role="listbox">
          {results.map((p, i) => (
            <li
              key={`${p.coords.join()}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              <strong>{p.label}</strong>
              <span>{p.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
