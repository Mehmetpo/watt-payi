import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBannerController, type BannerNative } from './bannerController';

type Listeners = { size?: (h: number) => void; loaded?: () => void; failed?: () => void };

function fakeNative() {
  const l: Listeners = {};
  const native: BannerNative & { l: Listeners } = {
    l,
    show: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    onSize: (cb) => { l.size = cb; },
    onLoaded: (cb) => { l.loaded = cb; },
    onFailed: (cb) => { l.failed = cb; },
  };
  return native;
}

const last = (a: number[]) => a[a.length - 1];
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('bannerController', () => {
  let native: ReturnType<typeof fakeNative>;
  let space: number[];
  let ready: () => Promise<void>;

  beforeEach(() => {
    native = fakeNative();
    space = [];
    ready = () => Promise.resolve();
  });

  function make() {
    return createBannerController(native, {
      ready: () => ready(),
      reservedHeightPx: () => 60,
      onSpace: (px) => space.push(px),
      onHeight: () => {},
    });
  }

  it('creates the banner once, then only toggles visibility with hide/resume', async () => {
    const c = make();
    c.setWanted(true);
    await flush();
    native.l.loaded!();
    native.l.size!(50);
    c.setWanted(false);
    await flush();
    c.setWanted(true);
    await flush();
    expect(native.show).toHaveBeenCalledTimes(1);
    expect(native.hide).toHaveBeenCalledTimes(1);
    expect(native.resume).toHaveBeenCalledTimes(1);
  });

  it('reserves the cached height while loading, then the real height, and 0 when unwanted', async () => {
    const c = make();
    c.setWanted(true);
    expect(last(space)).toBe(60);
    await flush();
    native.l.loaded!();
    native.l.size!(50);
    expect(last(space)).toBe(50);
    c.setWanted(false);
    expect(last(space)).toBe(0);
  });

  it('ignores the height-0 SizeChanged that a hide emits, so a quick re-show keeps the nav lifted', async () => {
    const c = make();
    c.setWanted(true);
    await flush();
    native.l.loaded!();
    native.l.size!(50);
    c.setWanted(false);
    c.setWanted(true);
    native.l.size!(0); // stale event from the hide
    await flush();
    expect(last(space)).toBe(50);
  });

  it('never shows the banner if Home unmounts before ads finish initialising', async () => {
    let release!: () => void;
    ready = () => new Promise<void>((r) => { release = r; });
    const c = make();
    c.setWanted(true);
    await flush();
    c.setWanted(false);
    release();
    await flush();
    expect(native.show).not.toHaveBeenCalled();
    expect(last(space)).toBe(0);
  });

  it('re-hides a banner that finishes loading after the user already left Home', async () => {
    const c = make();
    c.setWanted(true);
    await flush();
    c.setWanted(false);
    await flush();
    expect(native.hide).toHaveBeenCalledTimes(1);
    // iOS attaches the view visibly on load even though hide ran earlier.
    native.l.loaded!();
    await flush();
    expect(native.hide).toHaveBeenCalledTimes(2);
    expect(last(space)).toBe(0);
  });

  it('drops the reservation when the ad fails to load, and recreates it next time', async () => {
    const c = make();
    c.setWanted(true);
    await flush();
    native.l.failed!();
    expect(last(space)).toBe(0);
    c.setWanted(false);
    await flush();
    expect(native.hide).not.toHaveBeenCalled();
    c.setWanted(true);
    await flush();
    expect(native.show).toHaveBeenCalledTimes(2);
  });
});
