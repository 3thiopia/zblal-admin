interface BlueTankerIconProps {
  className?: string;
}

export function BlueTankerIcon({ className = 'w-7 h-5' }: BlueTankerIconProps) {
  return (
    <svg
      viewBox="0 0 64 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Rear suction hose coil & intake pipe */}
      <path
        d="M5 24C2.5 24 2.5 16 6 16H11"
        stroke="#1E3A8A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="6" y="21" width="5" height="5" rx="1" fill="#1E40AF" />

      {/* Top vacuum dome & valve hatch */}
      <rect x="20" y="6" width="8" height="3.5" rx="1.5" fill="#1E40AF" />
      <rect x="14" y="8" width="22" height="2.5" rx="1.2" fill="#93C5FD" />

      {/* Cylindrical septic vacuum tanker body */}
      <rect x="9" y="10" width="31" height="17" rx="8.5" fill="#2563EB" stroke="#1E3A8A" strokeWidth="1.6" />
      {/* Tank highlight & structural bands */}
      <path d="M16 12.5H33" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="19" y1="10.5" x2="19" y2="26.5" stroke="#1E40AF" strokeWidth="1.3" />
      <line x1="30" y1="10.5" x2="30" y2="26.5" stroke="#1E40AF" strokeWidth="1.3" />
      {/* Vacuum pressure gauge accent */}
      <circle cx="24.5" cy="18.5" r="2.6" fill="#EFF6FF" stroke="#1E3A8A" strokeWidth="1.1" />
      <path d="M24.5 18.5L26 17.2" stroke="#1D4ED8" strokeWidth="1.1" strokeLinecap="round" />

      {/* Truck chassis rail */}
      <rect x="8" y="27" width="49" height="4" rx="1.5" fill="#1E293B" />

      {/* Front truck cab (blue) */}
      <path
        d="M41 13H50.5C52.3 13 53.9 14 54.7 15.6L58 21.8V27H41V13Z"
        fill="#1D4ED8"
        stroke="#1E3A8A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Cab windshield */}
      <path
        d="M44 15.5H49.8C50.8 15.5 51.7 16.1 52.2 17L54.2 21H44V15.5Z"
        fill="#DBEAFE"
      />
      {/* Front headlight & bumper */}
      <rect x="55.5" y="23.5" width="3" height="2" rx="0.6" fill="#FDE047" />
      <rect x="55" y="27" width="4" height="3.5" rx="1" fill="#334155" />

      {/* Dual rear wheels & front wheel */}
      <circle cx="17" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="17" cy="33" r="2" fill="#CBD5E1" />
      <circle cx="29" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="29" cy="33" r="2" fill="#CBD5E1" />
      <circle cx="50" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="50" cy="33" r="2" fill="#CBD5E1" />
    </svg>
  );
}

export function getBlueTankerSvgString(width = 28, height = 19): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 24C2.5 24 2.5 16 6 16H11" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="6" y="21" width="5" height="5" rx="1" fill="#1E40AF"/>
    <rect x="20" y="6" width="8" height="3.5" rx="1.5" fill="#1E40AF"/>
    <rect x="14" y="8" width="22" height="2.5" rx="1.2" fill="#93C5FD"/>
    <rect x="9" y="10" width="31" height="17" rx="8.5" fill="#2563EB" stroke="#1E3A8A" stroke-width="1.6"/>
    <path d="M16 12.5H33" stroke="#93C5FD" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="19" y1="10.5" x2="19" y2="26.5" stroke="#1E40AF" stroke-width="1.3"/>
    <line x1="30" y1="10.5" x2="30" y2="26.5" stroke="#1E40AF" stroke-width="1.3"/>
    <circle cx="24.5" cy="18.5" r="2.6" fill="#EFF6FF" stroke="#1E3A8A" stroke-width="1.1"/>
    <path d="M24.5 18.5L26 17.2" stroke="#1D4ED8" stroke-width="1.1" stroke-linecap="round"/>
    <rect x="8" y="27" width="49" height="4" rx="1.5" fill="#1E293B"/>
    <path d="M41 13H50.5C52.3 13 53.9 14 54.7 15.6L58 21.8V27H41V13Z" fill="#1D4ED8" stroke="#1E3A8A" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M44 15.5H49.8C50.8 15.5 51.7 16.1 52.2 17L54.2 21H44V15.5Z" fill="#DBEAFE"/>
    <rect x="55.5" y="23.5" width="3" height="2" rx="0.6" fill="#FDE047"/>
    <rect x="55" y="27" width="4" height="3.5" rx="1" fill="#334155"/>
    <circle cx="17" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.4"/>
    <circle cx="17" cy="33" r="2" fill="#CBD5E1"/>
    <circle cx="29" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.4"/>
    <circle cx="29" cy="33" r="2" fill="#CBD5E1"/>
    <circle cx="50" cy="33" r="5" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.4"/>
    <circle cx="50" cy="33" r="2" fill="#CBD5E1"/>
  </svg>`;
}
