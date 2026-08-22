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
  microwave: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5" y="7.5" width="10.5" height="9" rx="1.2"/><circle cx="18.3" cy="10" r="1.1"/><line x1="16.8" y1="14.5" x2="19.8" y2="14.5"/>',
  iron: '<path d="M4 17c0-5 3.2-9.5 8-9.5h3.5A4.5 4.5 0 0 1 20 12v1.5A3.5 3.5 0 0 1 16.5 17H6.5A2.5 2.5 0 0 1 4 14.5"/><path d="M9.5 7.5V6a1.7 1.7 0 0 1 1.7-1.7h.6A1.7 1.7 0 0 1 13.5 6v1"/><circle cx="16.5" cy="11" r=".6" fill="currentColor" stroke="none"/>',
  hairdryer: '<rect x="7" y="6.5" width="10" height="5" rx="2.5"/><rect x="8.5" y="11.5" width="3.5" height="7.5" rx="1.6"/><line x1="18.5" y1="7" x2="21" y2="6"/><line x1="18.5" y1="9" x2="21.3" y2="9"/><line x1="18.5" y1="11" x2="21" y2="12"/>',
  freezer: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="9"/><line x1="10" y1="6" x2="14" y2="8"/><line x1="14" y1="6" x2="10" y2="8"/><line x1="8" y1="15" x2="8" y2="18"/>',
  blender: '<path d="M8.5 8h7l-1.1 7.3a1.4 1.4 0 0 1-1.4 1.2h-2a1.4 1.4 0 0 1-1.4-1.2Z"/><path d="M15.3 10.3c1.9-.4 3 .5 3 1.9s-1.1 2.2-3 1.9"/><rect x="7" y="16.8" width="10" height="3.2" rx="1.3"/><line x1="10.2" y1="12" x2="13.3" y2="14.3"/><line x1="13.3" y1="12" x2="10.2" y2="14.3"/>',
  coffee: '<path d="M5 8h11v6a4.5 4.5 0 0 1-4.5 4.5H9.5A4.5 4.5 0 0 1 5 14Z"/><path d="M16 9.5h1.5a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8 5.3c0 .9-1 1.1-1 2S8 8.4 8 7.5M12 5.3c0 .9-1 1.1-1 2s1 1.1 1 .2"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 1.5-5.5 3.5-5.5S18 6.5 16 9"/><path d="M14 13.3c2.6 1.2 5.1.6 5.9-1.2s-.4-4-3-5"/><path d="M10 13.7c-2.7 1-4.2 3.1-3.3 5s3.6 2.2 6 .8"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="9" y1="21.5" x2="15" y2="21.5"/>',
  router: '<rect x="3" y="14" width="18" height="5.5" rx="1.6"/><circle cx="7" cy="16.7" r=".6" fill="currentColor" stroke="none"/><circle cx="9.5" cy="16.7" r=".6" fill="currentColor" stroke="none"/><path d="M9 14c0-3 .8-5.2 2-7M15 14c0-3-.8-5.2-2-7M12 14V6.5"/>',
  gameconsole: '<rect x="2.5" y="8" width="19" height="10" rx="4"/><line x1="7" y1="11.3" x2="7" y2="14.7"/><line x1="5.3" y1="13" x2="8.7" y2="13"/><circle cx="17" cy="11.7" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="13.7" r=".9" fill="currentColor" stroke="none"/>',
  hood: '<path d="M4 9 8 4h8l4 5Z"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="10" y1="9" x2="9" y2="20"/><line x1="14" y1="9" x2="15" y2="20"/>',
  stove: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.3" cy="9.3" r="2.3"/><circle cx="15.7" cy="9.3" r="2.3"/><circle cx="8.3" cy="15.7" r="2.3"/><circle cx="15.7" cy="15.7" r="2.3"/>',
  waterdispenser: '<rect x="6" y="2.5" width="12" height="8" rx="1.4"/><path d="M8 10.5h8l-1 10a1 1 0 0 1-1 .9h-4a1 1 0 0 1-1-.9Z"/><line x1="9" y1="14.5" x2="15" y2="14.5"/>',
  airfryer: '<rect x="4" y="6.5" width="16" height="13.5" rx="5.5"/><rect x="8" y="3" width="8" height="3.7" rx="1.2"/><line x1="9" y1="16.5" x2="15" y2="16.5"/><circle cx="12" cy="4.8" r=".6" fill="currentColor" stroke="none"/>',
  spaceheater: '<rect x="7" y="3" width="10" height="16" rx="3"/><line x1="9.5" y1="6" x2="9.5" y2="16"/><line x1="12" y1="6" x2="12" y2="16"/><line x1="14.5" y1="6" x2="14.5" y2="16"/><rect x="6" y="19" width="12" height="2" rx="1"/>',
  dehumidifier: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M12 8c1.3 1.6 2 2.9 2 4a2 2 0 1 1-4 0c0-1.1.7-2.4 2-4Z"/><line x1="7" y1="17" x2="17" y2="17"/>',
  airpurifier: '<rect x="6.5" y="5" width="11" height="15" rx="4"/><path d="M9 3.5c1 .8 1.5 1.6 1.5 2.5M12 3c1 .8 1.5 1.6 1.5 2.5M15 3.5c1 .8 1.5 1.6 1.5 2.5"/><line x1="9" y1="12" x2="15" y2="12"/>',
  robotvacuum: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/><line x1="12" y1="3.5" x2="12" y2="6.2"/>',
  hairstraightener: '<rect x="9" y="2.5" width="6" height="17" rx="3"/><line x1="9" y1="7.2" x2="15" y2="7.2"/><circle cx="12" cy="4.7" r=".6" fill="currentColor" stroke="none"/><path d="M11 19.5c0 1.3.8 1.8.8 3"/>',
  shaver: '<rect x="7.5" y="9" width="9" height="11" rx="3"/><rect x="8.5" y="4" width="7" height="6" rx="2.5"/><circle cx="10.7" cy="6.8" r=".5" fill="currentColor" stroke="none"/><circle cx="12" cy="6.2" r=".5" fill="currentColor" stroke="none"/><circle cx="13.3" cy="6.8" r=".5" fill="currentColor" stroke="none"/>',
  breadmaker: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><rect x="6.5" y="6.5" width="7" height="9" rx="1.4"/><circle cx="17" cy="8.5" r="1.5"/><line x1="15.5" y1="14" x2="18.5" y2="14"/>',
  pressurecooker: '<path d="M5 12h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M5 12a7 7 0 0 1 14 0"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><circle cx="12" cy="4.3" r="1.1"/><line x1="12" y1="5.4" x2="12" y2="7"/>',
  printer: '<rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 8V4.5h10V8"/><rect x="8" y="16" width="8" height="4.5" rx="0.8"/><circle cx="16.5" cy="11.5" r=".6" fill="currentColor" stroke="none"/>',
  projector: '<rect x="3" y="7" width="13" height="9" rx="2.2"/><circle cx="18.5" cy="11.5" r="3.3"/><circle cx="18.5" cy="11.5" r="1.1"/><circle cx="6.5" cy="10" r=".6" fill="currentColor" stroke="none"/>',
  smartspeaker: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M9.5 3.3c1.3 1.1 1.3 1.9 0 3M14.5 3.3c1.3 1.1 1.3 1.9 0 3"/><circle cx="12" cy="12" r="1.6"/>',
  minifridge: '<rect x="6" y="4.5" width="12" height="16" rx="2"/><line x1="6" y1="10.5" x2="18" y2="10.5"/><line x1="9" y1="7" x2="9" y2="8.3"/>',
  waterpurifier: '<rect x="5" y="3" width="10" height="12" rx="1.6"/><line x1="7.5" y1="6" x2="12.5" y2="6"/><line x1="7.5" y1="9" x2="12.5" y2="9"/><path d="M15 15h3a1.5 1.5 0 0 1 1.5 1.5v0A1.5 1.5 0 0 1 18 18h-1.5"/><line x1="16.5" y1="18" x2="16.5" y2="21"/>',
  electricblanket: '<rect x="3" y="6" width="15" height="12" rx="2"/><path d="M6 10c1-1 2-1 3 0s2 1 3 0 2-1 3 0"/><path d="M6 14c1-1 2-1 3 0s2 1 3 0 2-1 3 0"/><path d="M18 10c1.5 0 3 .8 3 3s-1.5 3-3 3"/>',
  laptop: '<rect x="5" y="4" width="14" height="9.5" rx="1.3"/><path d="M2.5 18.5 4 15h16l1.5 3.5a1 1 0 0 1-1 1.3h-17a1 1 0 0 1-1-1.3Z"/>',
  monitor: '<rect x="3" y="3.5" width="18" height="13" rx="1.6"/><line x1="12" y1="16.5" x2="12" y2="19"/><path d="M8.5 21h7l-1-2h-5Z"/>',
  soundbar: '<rect x="2.5" y="9.5" width="19" height="5" rx="2.5"/><circle cx="7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1" fill="currentColor" stroke="none"/>',
  mediabox: '<rect x="4" y="9" width="16" height="7" rx="2"/><path d="M10.3 11.3v3.4l3-1.7Z" fill="currentColor" stroke="none"/><circle cx="17.5" cy="12.5" r=".6" fill="currentColor" stroke="none"/>',
  mixer: '<path d="M6.5 13h10l-1.3 5.2a2.3 2.3 0 0 1-2.2 1.8h-2.9a2.3 2.3 0 0 1-2.2-1.8Z"/><path d="M16 13V7.5A4.5 4.5 0 0 0 11.5 3H9.3"/><circle cx="9" cy="3.6" r="1.5"/><line x1="9" y1="5.1" x2="9" y2="8.5"/>',
  juicer: '<path d="M9 3.5a3 3 0 0 1 6 0c0 1.4-.9 2-1.5 3H10.5c-.6-1-1.5-1.6-1.5-3Z"/><path d="M7 9h10l-1.3 9.3A2 2 0 0 1 13.7 20h-3.4a2 2 0 0 1-2-1.7Z"/>',
  waterheatertank: '<path d="M7 5.5a5 5 0 0 1 10 0v13a5 5 0 0 1-10 0Z"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="12" y1="12" x2="12" y2="17"/><circle cx="12" cy="12" r="1.3"/>',
  handvacuum: '<rect x="8" y="4" width="7" height="10" rx="2.3"/><line x1="11.5" y1="14" x2="11.5" y2="17.5"/><path d="M8 8.5H5a1.5 1.5 0 0 0-1.5 1.5v0A1.5 1.5 0 0 0 5 11.5h1"/><path d="M9 17.5h5a1.7 1.7 0 0 1 1.7 1.7v0a1.7 1.7 0 0 1-1.7 1.7H9Z"/>',
  sewingmachine: '<rect x="3" y="16" width="16" height="3.5" rx="1"/><path d="M5 16c0-6 2.5-9.5 7-9.5h3a3 3 0 0 1 3 3v1.2"/><line x1="14.5" y1="10.5" x2="14.5" y2="16"/><circle cx="17.3" cy="9.5" r="1.4"/>',
  aquarium: '<rect x="3" y="6" width="18" height="12" rx="1.4"/><line x1="3" y1="10.5" x2="21" y2="10.5"/><path d="M8 18v-3.5c0-1 .6-1.5 1.3-2M15 18v-2.8c0-1.2.7-1.8 1.5-2.5"/><circle cx="12" cy="8.3" r=".6" fill="currentColor" stroke="none"/>',
  evcharger: '<rect x="4" y="8" width="10" height="12" rx="2"/><path d="M14 12h3.5a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5H16"/><path d="M9.5 11 8 15h2.5l-1 4 3.5-5H10.5Z" fill="currentColor" stroke="none"/><line x1="7" y1="5" x2="7" y2="8"/><line x1="11" y1="5" x2="11" y2="8"/>',
  lawnmower: '<path d="M4 15.5h11.5a2.5 2.5 0 0 0 2.5-2.5v-.3a2.5 2.5 0 0 0-2.2-2.5L9 9.3"/><circle cx="7" cy="18.3" r="2.2"/><circle cx="15.5" cy="18.3" r="2.2"/><path d="M9 9.3 15.5 4"/><line x1="13.5" y1="6" x2="17.5" y2="6"/>',
  other: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3.6"/><path d="M9.3 9.5a2.7 2.7 0 1 1 4 2.3c-1 .6-1.5 1.1-1.5 2.3"/><circle cx="11.8" cy="17.3" r=".9" fill="currentColor" stroke="none"/>',
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
