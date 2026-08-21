type BrandMarkProps = {
  size?: number;
};

// Matches the bolt artwork in resources/generate-master-icons.mjs (the same
// paths used to render the native app icon), so the in-app mark and the
// launcher icon are the same shape.
export function BrandMark({ size = 26 }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 30 L35 30 L20 55 L40 55 L15 90 L55 45 L35 45 L60 10 Z" fill="currentColor" opacity="0.95" />
      <path d="M50 30 L75 30 L60 55 L80 55 L55 90 L95 45 L75 45 L100 10 Z" fill="currentColor" opacity="0.55" transform="translate(-8,0)" />
    </svg>
  );
}
