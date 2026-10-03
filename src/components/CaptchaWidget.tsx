import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
const BRIDGE_URL = import.meta.env.VITE_TURNSTILE_BRIDGE_URL as string | undefined;
const MESSAGE_SOURCE = 'wattpayi-turnstile';

export interface CaptchaHandle {
  reset(): void;
}

interface CaptchaWidgetProps {
  onSuccess(token: string): void;
  /** Token expired or the widget errored — the caller should drop its token. */
  onInvalidate(): void;
}

/**
 * Cloudflare Turnstile only runs on http(s) origins. Android's WebView serves
 * the app from https://localhost, so the widget works in place; iOS serves it
 * from capacitor://localhost, where it never verifies. On iOS we therefore
 * frame turnstile-bridge/index.html (deployed to a real https host,
 * VITE_TURNSTILE_BRIDGE_URL) and receive the token via postMessage.
 */
export const CaptchaWidget = forwardRef<CaptchaHandle, CaptchaWidgetProps>(function CaptchaWidget(
  { onSuccess, onInvalidate },
  ref,
) {
  const useBridge = Capacitor.getPlatform() === 'ios' && !!BRIDGE_URL;
  const turnstileRef = useRef<TurnstileInstance>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Keep the latest callbacks without re-subscribing the message listener.
  const handlers = useRef({ onSuccess, onInvalidate });
  handlers.current = { onSuccess, onInvalidate };

  useImperativeHandle(ref, () => ({
    reset() {
      if (useBridge) {
        frameRef.current?.contentWindow?.postMessage({ source: MESSAGE_SOURCE, type: 'reset' }, '*');
      } else {
        turnstileRef.current?.reset();
      }
    },
  }), [useBridge]);

  useEffect(() => {
    if (!useBridge || !BRIDGE_URL) return;
    const bridgeOrigin = new URL(BRIDGE_URL).origin;
    function onMessage(e: MessageEvent) {
      if (e.origin !== bridgeOrigin || e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as { source?: string; type?: string; token?: string | null } | null;
      if (!data || data.source !== MESSAGE_SOURCE) return;
      if (data.type === 'success' && data.token) handlers.current.onSuccess(data.token);
      else if (data.type === 'expired' || data.type === 'error') handlers.current.onInvalidate();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [useBridge]);

  if (useBridge && BRIDGE_URL) {
    const src = new URL(BRIDGE_URL);
    src.searchParams.set('sitekey', SITE_KEY);
    src.searchParams.set('lang', 'tr');
    return (
      <iframe
        ref={frameRef}
        src={src.toString()}
        title="Güvenlik doğrulaması"
        className="captcha-bridge-frame"
        // Normal Turnstile widget: 300×65.
        width={300}
        height={65}
      />
    );
  }

  return (
    <Turnstile
      ref={turnstileRef}
      siteKey={SITE_KEY}
      onSuccess={onSuccess}
      onExpire={onInvalidate}
      onError={onInvalidate}
    />
  );
});
