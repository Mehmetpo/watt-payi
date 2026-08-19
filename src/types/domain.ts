export interface DeviceCatalogEntry {
  key: string;
  name: string;
  defaultWatt: number;
  iconKey: string;
}

export interface UserDevice {
  id: string;
  deviceKey: string | null;
  customName: string | null;
  watt: number;
  isCustom: boolean;
}

export interface Bill {
  id: string;
  periodMonth: string;
  totalTl: number;
  rateTlPerKwh: number;
  photoUrl: string | null;
}

export interface BillItem {
  id: string;
  deviceKey: string | null;
  deviceName: string;
  watt: number;
  hoursPerWeek: number;
  monthlyKwhRaw: number;
  calibratedTl: number;
  pctShare: number;
}
