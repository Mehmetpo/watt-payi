import { describe, it, expect } from 'vitest';
import { translate } from './translate';

const dicts = {
  tr: { hello: 'Merhaba {name}', plain: 'Düz', cnt: '{n} cihaz', trOnly: 'Sadece TR' },
  en: { hello: 'Hello {name}', plain: 'Plain', cnt: '{n} devices', 'cnt.one': '{n} device' },
} as const;

describe('translate', () => {
  it('returns the string for the language', () => {
    expect(translate(dicts, 'tr', 'plain')).toBe('Düz');
    expect(translate(dicts, 'en', 'plain')).toBe('Plain');
  });

  it('interpolates {params}', () => {
    expect(translate(dicts, 'en', 'hello', { name: 'Ada' })).toBe('Hello Ada');
    expect(translate(dicts, 'tr', 'hello', { name: 'Ada' })).toBe('Merhaba Ada');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(translate(dicts, 'en', 'hello')).toBe('Hello {name}');
  });

  it('falls back to Turkish when the key is missing in the language', () => {
    expect(translate(dicts, 'en', 'trOnly')).toBe('Sadece TR');
  });

  it('returns the key itself when no dictionary has it', () => {
    expect(translate(dicts, 'en', 'nope')).toBe('nope');
  });

  it('picks the .one variant for n === 1 when it exists', () => {
    expect(translate(dicts, 'en', 'cnt', { n: 1 })).toBe('1 device');
    expect(translate(dicts, 'en', 'cnt', { n: 3 })).toBe('3 devices');
    expect(translate(dicts, 'en', 'cnt', { n: 0 })).toBe('0 devices');
  });

  it('never uses .one for Turkish', () => {
    expect(translate(dicts, 'tr', 'cnt', { n: 1 })).toBe('1 cihaz');
  });
});
