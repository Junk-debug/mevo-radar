import { Fragment, useEffect, useId, useRef, useState } from "react";
import { cx, Icon, type IconName } from "@/components/ui";
import { useI18n } from "@/i18n";
import { searchPlaces } from "@/services/geocode";
import type { Field, PlaceValue } from "@/store/route";
import { recentPlaces } from "@/utils/recentPlaces";

interface Props {
  field: Field;
  value: PlaceValue | null;
  placeholder: string;
  onChoose: (place: PlaceValue | null) => void;
  onPickOnMap: () => void;
  onUseMyLocation?: () => void;
  onFocus?: () => void;
}

interface Option {
  key: string;
  label: string;
  detail?: string;
  icon: "me" | "map" | "recent" | "place";
  run: () => void;
}

const MIN_QUERY = 3;
const DEBOUNCE_MS = 350;

const ICONS: Record<Option["icon"], IconName> = { me: "target", map: "pin", recent: "clock", place: "pin-outline" };

const DOT: Record<Field, string> = {
  from: "rounded-full border-[2.5px] border-ink",
  to: "rounded-[2px] bg-accent rotate-45",
};

export function PlaceInput({ field, value, placeholder, onChoose, onPickOnMap, onUseMyLocation, onFocus }: Props) {
  const { t, lang } = useI18n();
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setText(value?.label ?? "");
  }, [value]);

  const close = (keepText = false) => {
    editing.current = false;
    setOpen(false);
    if (!keepText) setText(value?.label ?? "");
  };

  const pick = (place: PlaceValue | null) => {
    editing.current = false;
    onChoose(place);
    setText(place?.label ?? "");
    setOpen(false);
  };

  useEffect(() => {
    const query = text.trim();
    if (!editing.current || query.length < MIN_QUERY) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(query, lang, ctrl.signal)
        .then((found) => {
          setResults(
            found.map((p, i) => ({
              key: `r${i}`,
              label: p.label,
              detail: p.detail,
              icon: "place",
              run: () => pick({ ...p, kind: "search" }),
            })),
          );
          setActive(0);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, lang]);

  const typing = editing.current && text.trim().length >= MIN_QUERY;
  const shortcuts: Option[] = [
    ...(onUseMyLocation && value?.kind !== "me"
      ? [{ key: "me", label: t("myLocation"), icon: "me" as const, run: () => { close(); onUseMyLocation(); } }]
      : []),
    { key: "map", label: t("chooseOnMap"), icon: "map", run: () => { close(); onPickOnMap(); } },
    ...recentPlaces()
      .filter((p) => p.label !== value?.label)
      .map((p, i) => ({ key: `h${i}`, label: p.label, detail: p.detail, icon: "recent" as const, run: () => pick({ ...p, kind: "search" }) })),
  ];
  const options = typing ? results : shortcuts;

  return (
    <div className="relative flex items-center gap-2.5 pr-11 pl-3.5 not-first:border-t not-first:border-line">
      <span className={cx("size-2.5 flex-none", DOT[field])} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{t(field)}</label>
      <input
        id={id}
        className={cx(
          "flex-1 min-w-0 border-0 bg-transparent px-0 py-[13px] outline-none placeholder:text-muted",
          value?.kind === "me" ? "text-me font-semibold" : field === "to" && "font-semibold",
        )}
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={`${id}-list`}
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
          setActive(0);
          onFocus?.();
        }}
        onChange={(e) => {
          editing.current = true;
          setText(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => close(), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") return close();
          if (!open || !options.length) return;
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, options.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter") options[active]?.run();
          else return;
          e.preventDefault();
        }}
      />
      {open && options.length > 0 && (
        <ul
          className="absolute z-5 top-[calc(100%_+_4px)] left-0 right-0 m-0 p-1 list-none max-h-[50vh] overflow-y-auto bg-surface border border-line rounded-md shadow-panel"
          id={`${id}-list`}
          role="listbox"
        >
          {options.map((o, i) => (
            <Fragment key={o.key}>
              {o.icon === "recent" && options[i - 1]?.icon !== "recent" && (
                <li className="pt-2 px-2.5 pb-0.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted" role="presentation">{t("recent")}</li>
              )}
              <li
                role="option"
                aria-selected={i === active}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm cursor-pointer aria-selected:bg-surface-2 hover:bg-surface-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  o.run();
                }}
              >
                <Icon name={ICONS[o.icon]} className={cx("flex-none", o.icon === "me" ? "text-me" : "text-muted")} />
                <span className="grid min-w-0">
                  <strong>{o.label}</strong>
                  {o.detail && <small className="text-[12.5px] text-muted truncate">{o.detail}</small>}
                </span>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
