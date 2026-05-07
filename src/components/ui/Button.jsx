const SIZES = {
  sm: { padX: 12, h: 36, fz: 14 },
  md: { padX: 16, h: 44, fz: 15 },
  lg: { padX: 20, h: 48, fz: 16 },
};

const VARIANTS = {
  primary:     { bg: 'var(--mp-blue)',              fg: '#FFFFFF',            border: 'transparent' },
  accent:      { bg: 'var(--mp-coral)',             fg: '#FFFFFF',            border: 'transparent' },
  secondary:   { bg: 'var(--surface-elevated)',     fg: 'var(--mp-blue)',     border: 'var(--mp-blue)' },
  ghost:       { bg: 'transparent',                fg: 'var(--text-1)',      border: 'transparent' },
  destructive: { bg: 'var(--error)',               fg: '#FFFFFF',            border: 'transparent' },
  onDark:      { bg: 'rgba(255,255,255,0.10)',      fg: '#FFFFFF',            border: 'rgba(255,255,255,0.20)' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  style,
  disabled,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      disabled={disabled}
      {...rest}
      style={{
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        height: s.h,
        padding: `0 ${s.padX}px`,
        borderRadius: 12,
        fontSize: s.fz,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all var(--motion-fast)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
