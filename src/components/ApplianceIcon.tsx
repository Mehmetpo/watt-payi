const PATHS: Record<string, string> = {
  fridge: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="8" y1="5.5" x2="8" y2="7"/><line x1="8" y1="13" x2="8" y2="14.5"/>',
  ac: '<rect x="3" y="7" width="18" height="7" rx="2"/><path d="M6 17c0 1.5 1 2 1 3.5M12 17c0 1.5 1 2 1 3.5M18 17c0 1.5 1 2 1 3.5"/><circle cx="17.5" cy="10.5" r=".6" fill="currentColor" stroke="none"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5.2"/><circle cx="12" cy="13" r="2"/><line x1="7" y1="6" x2="8.6" y2="6"/><line x1="10.4" y1="6" x2="12" y2="6"/>',
  dishwasher: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><line x1="4" y1="7.5" x2="20" y2="7.5"/><circle cx="12" cy="14.5" r="4.3"/><line x1="12" y1="11" x2="12" y2="18"/><line x1="8.7" y1="14.5" x2="15.3" y2="14.5"/>',
  oven: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="10" width="12" height="8" rx="1.4"/><line x1="6.5" y1="6.2" x2="9.5" y2="6.2"/><line x1="12" y1="6.2" x2="15" y2="6.2"/>',
  toaster: '<path d="M4 10c0-3 1.5-5 3-5h10c1.5 0 3 2 3 5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z"/><line x1="9" y1="8.5" x2="9" y2="14.5"/><line x1="15" y1="8.5" x2="15" y2="14.5"/>',
  kettle: '<path d="M5 20h11a2 2 0 0 0 2-2v-2.2c2.6-.5 3.6-2 3.6-2s-1.4-1.2-3.6-1V11a5.5 5.5 0 0 0-5.5-5.5H9A5.5 5.5 0 0 0 5 11Z"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="14" y1="20" x2="14" y2="22"/>',
  tv: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><line x1="8" y1="20.5" x2="16" y2="20.5"/><line x1="12" y1="16.5" x2="12" y2="20.5"/>',
  pc: '<rect x="4" y="4" width="16" height="11" rx="2"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="15" x2="12" y2="20"/>',
  lighting: '<circle cx="12" cy="9.5" r="5.5"/><path d="M9.5 19h5M10 22h4"/><line x1="12" y1="14.8" x2="12" y2="17.2"/>',
  vacuum: '<circle cx="8" cy="7" r="3.4"/><path d="M10.8 9.2 18 16.4a2 2 0 1 1-2.8 2.8L8 11.9"/><line x1="18" y1="16.4" x2="21" y2="19.4"/>',
  dryer: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13.5" r="5"/><circle cx="12" cy="13.5" r="1.7"/>',
  heater: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9 8c0 1.2-1.5 1.6-1.5 3S9 13.5 9 12.3M13 8c0 1.2-1.5 1.6-1.5 3S13 13.5 13 12.3M17 8c0 1.2-1.5 1.6-1.5 3S17 13.5 17 12.3"/><line x1="8" y1="17" x2="16" y2="17"/>',
};

export interface ApplianceIconProps {
  iconKey: string;
  size?: number;
}

export function ApplianceIcon({ iconKey, size = 20 }: ApplianceIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: PATHS[iconKey] ?? '' }}
    />
  );
}
