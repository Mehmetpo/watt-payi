import { describe, expect, it } from 'vitest';
import { pickAdUnits, PROD_ANDROID, PROD_IOS, TEST_UNITS } from './adConfig';

describe('pickAdUnits', () => {
  it('uses Google test units in test mode on every platform', () => {
    expect(pickAdUnits('ios', true)).toBe(TEST_UNITS);
    expect(pickAdUnits('android', true)).toBe(TEST_UNITS);
  });

  it('uses the iOS app ad units on iOS', () => {
    expect(pickAdUnits('ios', false)).toBe(PROD_IOS);
  });

  it('uses the Android app ad units on Android and anything else', () => {
    expect(pickAdUnits('android', false)).toBe(PROD_ANDROID);
    expect(pickAdUnits('web', false)).toBe(PROD_ANDROID);
  });

  it('never shares a production unit id between the two apps', () => {
    const android = Object.values(PROD_ANDROID);
    for (const id of Object.values(PROD_IOS)) expect(android).not.toContain(id);
  });
});
