import { describe, it, expect } from 'vitest';
import { tr } from './dictionaries/tr';
import { en } from './dictionaries/en';
import { DEVICE_CATALOG, DEVICE_CATEGORIES } from '../data/deviceCatalog';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('dictionaries', () => {
  it('en has exactly the keys of tr, plus optional .one plural variants', () => {
    const trKeys = Object.keys(tr);
    const enBase = Object.keys(en).filter((k) => !k.endsWith('.one'));
    expect(enBase.sort()).toEqual([...trKeys].sort());
    for (const k of Object.keys(en).filter((k) => k.endsWith('.one'))) {
      expect(trKeys).toContain(k.slice(0, -4));
    }
  });

  it('uses the same {placeholders} in both languages', () => {
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      expect(placeholders(en[key]), key).toBe(placeholders(tr[key]));
    }
  });

  it('has no empty strings', () => {
    for (const d of [tr, en]) {
      for (const [k, v] of Object.entries(d)) {
        if (k.endsWith('Suffix')) continue; // punctuation glue, legitimately empty in English
        expect(v.trim(), k).not.toBe('');
      }
    }
  });

  it('keeps tr device names identical to the catalog (they are stored in the DB)', () => {
    for (const d of DEVICE_CATALOG) {
      expect(tr[`device.${d.key}` as keyof typeof tr], d.key).toBe(d.name);
      expect(en[`device.${d.key}` as keyof typeof en], d.key).toBeTruthy();
    }
  });

  it('defines a category label for every category in both languages', () => {
    for (const c of DEVICE_CATEGORIES) {
      expect(tr[`deviceCategory.${c.id}` as keyof typeof tr], c.id).toBeTruthy();
      expect(en[`deviceCategory.${c.id}` as keyof typeof en], c.id).toBeTruthy();
    }
  });
});
