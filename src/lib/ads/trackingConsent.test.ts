import { describe, it, expect, vi } from 'vitest';
import { ensureTrackingDecision, type TrackingDeps } from './trackingConsent';

function makeDeps(over: Partial<TrackingDeps> = {}): TrackingDeps {
  return {
    isIos: () => true,
    getStatus: vi.fn().mockResolvedValue('notDetermined'),
    requestSystemPrompt: vi.fn().mockResolvedValue(undefined),
    showExplainer: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe('ensureTrackingDecision', () => {
  it('shows the explainer, then the system prompt, in that order', async () => {
    const order: string[] = [];
    const deps = makeDeps({
      showExplainer: vi.fn(async () => { order.push('explainer'); }),
      requestSystemPrompt: vi.fn(async () => { order.push('system'); }),
    });
    await ensureTrackingDecision(deps);
    expect(order).toEqual(['explainer', 'system']);
  });

  it('does nothing off iOS', async () => {
    const deps = makeDeps({ isIos: () => false });
    await ensureTrackingDecision(deps);
    expect(deps.getStatus).not.toHaveBeenCalled();
    expect(deps.showExplainer).not.toHaveBeenCalled();
    expect(deps.requestSystemPrompt).not.toHaveBeenCalled();
  });

  it.each(['authorized', 'denied', 'restricted'] as const)(
    'skips both prompts when status is already %s',
    async (status) => {
      const deps = makeDeps({ getStatus: vi.fn().mockResolvedValue(status) });
      await ensureTrackingDecision(deps);
      expect(deps.showExplainer).not.toHaveBeenCalled();
      expect(deps.requestSystemPrompt).not.toHaveBeenCalled();
    },
  );

  it('swallows plugin errors so ads can still start', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ getStatus: vi.fn().mockRejectedValue(new Error('boom')) });
    await expect(ensureTrackingDecision(deps)).resolves.toBeUndefined();
    err.mockRestore();
  });
});

describe('explainer bridge', () => {
  it('opens the explainer, waits for the tap, then asks the system prompt once', async () => {
    vi.resetModules();
    const requestTrackingAuthorization = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }));
    vi.doMock('@capacitor-community/admob', () => ({
      AdMob: {
        trackingAuthorizationStatus: vi.fn().mockResolvedValue({ status: 'notDetermined' }),
        requestTrackingAuthorization,
      },
    }));
    const mod = await import('./trackingConsent');

    const seen: boolean[] = [];
    const unsubscribe = mod.subscribeTrackingExplainer((open) => seen.push(open));

    const first = mod.requestTrackingConsent();
    const second = mod.requestTrackingConsent(); // concurrent caller shares the same tap
    await vi.waitFor(() => expect(seen).toEqual([true]));
    expect(requestTrackingAuthorization).not.toHaveBeenCalled();

    mod.acknowledgeTrackingExplainer();
    await Promise.all([first, second]);

    expect(seen).toEqual([true, false]);
    expect(requestTrackingAuthorization).toHaveBeenCalled();
    unsubscribe();
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor-community/admob');
  });
});
