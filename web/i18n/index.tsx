import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { load, save } from "@/utils/storage";
import { en } from "./en";
import { pl, type Dict } from "./pl";

export type Lang = "pl" | "en";
export type MessageKey = keyof Dict;
type Vars = Record<string, string | number>;
type Translate = (key: MessageKey, vars?: Vars) => string;

const DICTS: Record<Lang, Dict> = { pl, en };
const LANG_KEY = "mevo.lang";

function initialLang(): Lang {
  const saved = load(LANG_KEY);
  if (saved === "pl" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

// "{n}" inserts a value; "{n:one|few|many}" picks a plural form by Intl.PluralRules
// (Polish uses all three, English only "one|other").
function format(template: string, plural: Intl.PluralRules, vars: Vars = {}) {
  return template
    .replace(/\{(\w+):([^}]+)\}/g, (_, name: string, forms: string) => {
      const f = forms.split("|");
      const category = plural.select(Number(vars[name] ?? 0));
      return (category === "one" ? f[0] : category === "few" ? f[1] : f[f.length - 1]) ?? "";
    })
    .replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translate } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const value = useMemo(() => {
    const plural = new Intl.PluralRules(lang);
    return {
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        document.documentElement.lang = l;
        save(LANG_KEY, l);
      },
      t: (key: MessageKey, vars?: Vars) => format(DICTS[lang][key], plural, vars),
    };
  }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
