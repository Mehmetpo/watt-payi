import { ApplianceIcon } from './ApplianceIcon';
import { getApplianceVisualSrc } from '../lib/applianceVisuals';

export interface ApplianceVisualProps {
  iconKey: string;
  size?: number;
  imageSize?: number;
}

export function ApplianceVisual({ iconKey, size = 20, imageSize }: ApplianceVisualProps) {
  const imageSrc = getApplianceVisualSrc(iconKey);

  if (!imageSrc) {
    return <ApplianceIcon iconKey={iconKey} size={size} />;
  }

  const renderedSize = imageSize ?? Math.round(size * 1.45);

  return (
    <img
      src={imageSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={renderedSize}
      height={renderedSize}
      style={{ display: 'block', objectFit: 'contain', flex: 'none', pointerEvents: 'none', userSelect: 'none' }}
    />
  );
}
