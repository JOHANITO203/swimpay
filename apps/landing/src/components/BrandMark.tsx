interface BrandMarkProps {
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
} as const;

export default function BrandMark({ size = 'md' }: BrandMarkProps) {
  return (
    <span className={`inline-grid shrink-0 place-items-center overflow-hidden bg-black ${sizeClasses[size]}`} aria-hidden="true">
      <img src="/brand/swimpay-icon.svg" alt="" className="h-full w-full" />
    </span>
  );
}
