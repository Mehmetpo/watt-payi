import type { Lang } from './language';

export type Dictionary = Readonly<Record<string, string>>;
export type Dictionaries = Readonly<Record<Lang, Dictionary>>;
export type Params = Readonly<Record<string, string | number>>;

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

// Lookup order: `key.one` (en, n === 1) -> key in lang -> key in tr -> the key itself.
export function translate(dicts: Dictionaries, lang: Lang, key: string, params?: Params): string {
  const own = dicts[lang];
  if (lang === 'en' && params && Number(params.n) === 1) {
    const one = own[`${key}.one`];
    if (one !== undefined) return interpolate(one, params);
  }
  const hit = own[key] ?? dicts.tr[key];
  return hit === undefined ? key : interpolate(hit, params);
}
