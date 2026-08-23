type IconProps = { className?: string };

export function TableIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="4.2" rx="1.4" />
      <path d="M6 10.2V20M18 10.2V20" />
    </svg>
  );
}

export function MenuListIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PotIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 11h15v3a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6v-3Z" />
      <path d="M2.5 11h19M7 11V9M17 11V9" />
      <path d="M11 3c.8 1.6-1 2-1 3.4a1.7 1.7 0 0 0 3.4 0c0-1-.6-1.4-.6-2.4" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 17c3-1 13-1 16 0" />
      <path d="M6.5 17c0-5.2 1.8-9 5.5-9s5.5 3.8 5.5 9" />
      <path d="M12 5.2V3.5" />
      <circle cx="12" cy="3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReceiptCheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3.5h12v17l-2.2-1.4L14 20.5l-2-1.4-2 1.4-1.8-1.4L6 20.5V3.5Z" />
      <path d="M8.5 8h7M8.5 11.2h4.5" />
      <path d="M9 15.3l1.8 1.8L15 13" />
    </svg>
  );
}
