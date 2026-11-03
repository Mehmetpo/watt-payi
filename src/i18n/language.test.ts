import { describe, it, expect } from 'vitest';
import { detectLanguage, resolveLanguage, parseLanguagePreference } from './language';

describe('detectLanguage', () => {
  it('maps Turkish locales to tr', () => {
    expect(detectLanguage(['tr-TR'])).toBe('tr');
    expect(detectLanguage(['tr'])).toBe('tr');
  });

  it('maps English locales to en', () => {
    expect(detectLanguage(['en-US'])).toBe('en');
    expect(detectLanguage(['en_GB'])).toBe('en');
  });

  it('is case-insensitive and accepts underscore separators', () => {
    expect(detectLanguage(['TR_tr'])).toBe('tr');
    expect(detectLanguage(['EN-us'])).toBe('en');
  });

  it('uses the first supported language in preference order', () => {
    expect(detectLanguage(['de-DE', 'en-US', 'tr-TR'])).toBe('en');
    expect(detectLanguage(['tr-TR', 'en-US'])).toBe('tr');
  });

  it('falls back to English for a known but unsupported device language', () => {
    expect(detectLanguage(['de-DE'])).toBe('en');
    expect(detectLanguage(['ar-SA', 'nl-NL'])).toBe('en');
  });

  it('falls back to Turkish (the app default) when nothing is known', () => {
    expect(detectLanguage([])).toBe('tr');
    expect(detectLanguage(['', undefined as unknown as string])).toBe('tr');
  });
});

describe('parseLanguagePreference', () => {
  it('accepts the three valid values', () => {
    expect(parseLanguagePreference('auto')).toBe('auto');
    expect(parseLanguagePreference('tr')).toBe('tr');
    expect(parseLanguagePreference('en')).toBe('en');
  });

  it('treats anything else as auto', () => {
    expect(parseLanguagePreference(null)).toBe('auto');
    expect(parseLanguagePreference('')).toBe('auto');
    expect(parseLanguagePreference('fr')).toBe('auto');
  });
});

describe('resolveLanguage', () => {
  it('lets an explicit preference win over the device locale', () => {
    expect(resolveLanguage('tr', ['en-US'])).toBe('tr');
    expect(resolveLanguage('en', ['tr-TR'])).toBe('en');
  });

  it('follows the device locale on auto', () => {
    expect(resolveLanguage('auto', ['en-US'])).toBe('en');
    expect(resolveLanguage('auto', ['tr-TR'])).toBe('tr');
  });
});
