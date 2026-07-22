import type { ReactNode, SVGProps } from 'react';

type CategoryIconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

type IconBaseProps = CategoryIconProps & {
  children: ReactNode;
};

const BRAND_BLUE = 'var(--color-brand-blue, #0076DD)';
const BRAND_LIGHT = 'var(--color-brand-light, #64B0F3)';
const BRAND_YELLOW = 'var(--color-brand-yellow, #FACB5C)';
const BRAND_GREEN = 'var(--color-brand-green, #B4BF8A)';

function IconBase({ title, children, ...props }: IconBaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

function LeafAccent({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M1.1 5.9C1.45 2.85 3.35 1.05 6.8.7c-.1 3.25-1.75 5.25-4.95 5.65"
        fill={BRAND_GREEN}
        stroke={BRAND_GREEN}
        strokeWidth="1.1"
      />
      <path d="M1.45 6.1 5.35 2.3" stroke="currentColor" strokeWidth=".85" opacity=".72" />
    </g>
  );
}

function SunAccent({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={BRAND_YELLOW} strokeWidth="1.25">
      <circle cx="4" cy="4" r="2.15" fill={BRAND_YELLOW} stroke="none" />
      <path d="M4 .5v1M4 6.5v1M.5 4h1M6.5 4h1M1.5 1.5l.7.7M5.8 5.8l.7.7M6.5 1.5l-.7.7M2.2 5.8l-.7.7" />
    </g>
  );
}

/** Visão geral e indicadores principais. */
export function DashboardCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="5.5" y="5.5" width="5" height="4.5" rx="1.2" fill={BRAND_BLUE} fillOpacity=".18" stroke="currentColor" strokeWidth="1.35" />
      <rect x="13.5" y="5.5" width="5" height="4.5" rx="1.2" fill={BRAND_LIGHT} fillOpacity=".2" stroke="currentColor" strokeWidth="1.35" />
      <rect x="5.5" y="13.5" width="5" height="5" rx="1.2" fill={BRAND_GREEN} fillOpacity=".2" stroke="currentColor" strokeWidth="1.35" />
      <path d="M14 17.7v-2.3M16.1 17.7v-4.1M18.2 17.7v-6" stroke={BRAND_YELLOW} strokeWidth="1.55" />
      <path d="m13.7 13.7 2-1.55 1.45.65 1.55-1.75" stroke={BRAND_YELLOW} strokeWidth="1.35" />
    </IconBase>
  );
}

/** Cadastro e relacionamento com clientes. */
export function ClientsCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" fill={BRAND_LIGHT} fillOpacity=".18" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="16.25" cy="9" r="2.35" fill={BRAND_GREEN} fillOpacity=".2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 19.5c.35-4.05 2.4-6.1 5.55-6.1 3.2 0 5.25 2.05 5.6 6.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.75 14.4c3.75-.55 6.05 1.2 6.55 4.85" stroke="currentColor" strokeWidth="1.55" />
      <LeafAccent x={14.9} y={14.8} />
    </IconBase>
  );
}

/** Propostas comerciais, documentos e aprovação. */
export function ProposalsCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 2.75h8.2L18.5 8v12.25A1.75 1.75 0 0 1 16.75 22h-11A1.75 1.75 0 0 1 4 20.25V4.5A1.75 1.75 0 0 1 5.75 2.75Z" stroke="currentColor" strokeWidth="1.65" />
      <path d="M13 2.95V8h5" stroke="currentColor" strokeWidth="1.55" />
      <path d="M6.5 12.1h8.2l-1.35 5.25H7.8Z" fill={BRAND_BLUE} fillOpacity=".2" stroke={BRAND_BLUE} strokeWidth="1.25" />
      <path d="M9.2 12.15 8.7 17.2M12.05 12.15l-.5 5.05M6.95 14.65h7.1" stroke={BRAND_LIGHT} strokeWidth="1" />
      <circle cx="17.65" cy="17.65" r="3.3" fill={BRAND_GREEN} stroke="currentColor" strokeWidth="1.2" />
      <path d="m16.2 17.65 1 1 1.9-2.1" stroke="white" strokeWidth="1.35" />
    </IconBase>
  );
}

/** Catálogo de módulos, inversores e kits solares. */
export function SolarKitsCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 8 8-4 8 4-8 4Z" fill={BRAND_BLUE} fillOpacity=".16" stroke="currentColor" strokeWidth="1.65" />
      <path d="M4 8v8.5l8 4.25 8-4.25V8M12 12v8.65" stroke="currentColor" strokeWidth="1.65" />
      <path d="m7.25 6.35 7.8 3.9M9.65 5.15l7.7 3.85" stroke={BRAND_LIGHT} strokeWidth="1" opacity=".9" />
      <SunAccent x={2.1} y={1.15} />
      <LeafAccent x={14.85} y={14.9} />
    </IconBase>
  );
}

/** Editor visual e personalização do PDF. */
export function DesignPdfCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 2.75h8.2L18.5 8v12.25A1.75 1.75 0 0 1 16.75 22h-11A1.75 1.75 0 0 1 4 20.25V4.5A1.75 1.75 0 0 1 5.75 2.75Z" stroke="currentColor" strokeWidth="1.65" />
      <path d="M13 2.95V8h5" stroke="currentColor" strokeWidth="1.55" />
      <path d="m7.1 16.85 1.15-4.15 5.55-5.55 2.95 2.95-5.55 5.55Z" fill={BRAND_BLUE} fillOpacity=".2" stroke={currentColorFallback} strokeWidth="1.35" />
      <path d="m8.25 12.7 2.95 2.95M13.8 7.15l2.95 2.95" stroke={BRAND_LIGHT} strokeWidth="1.15" />
      <path d="m7.1 16.85 4.1-1.2-2.95-2.95Z" fill={BRAND_YELLOW} stroke="currentColor" strokeWidth="1" />
      <LeafAccent x={14.7} y={14.8} />
    </IconBase>
  );
}

const currentColorFallback = 'currentColor';

/** Preferências, segurança e personalização da conta. */
export function SettingsCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M9.65 3.45 10.3 2h3.4l.65 1.45 1.65.7 1.5-.55 2.4 2.4-.55 1.5.7 1.65L21.5 9.8v3.4l-1.45.65-.7 1.65.55 1.5-2.4 2.4-1.5-.55-1.65.7L13.7 21h-3.4l-.65-1.45-1.65-.7-1.5.55-2.4-2.4.55-1.5-.7-1.65L2.5 13.2V9.8l1.45-.65.7-1.65L4.1 6l2.4-2.4 1.5.55Z"
        fill={BRAND_BLUE}
        fillOpacity=".13"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <circle cx="12" cy="11.5" r="3.25" fill={BRAND_YELLOW} fillOpacity=".9" stroke="currentColor" strokeWidth="1.35" />
      <LeafAccent x={13.8} y={13.5} />
    </IconBase>
  );
}

/** Administração, permissões e segurança operacional. */
export function AdminCategoryIcon(props: CategoryIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2.5c2.55 1.7 5 2.5 7.3 2.5v5.4c0 4.8-2.45 8.45-7.3 11.1-4.85-2.65-7.3-6.3-7.3-11.1V5C7 5 9.45 4.2 12 2.5Z" fill={BRAND_BLUE} fillOpacity=".17" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.8 11.85 2.05 2.05 4.45-4.75" stroke={BRAND_GREEN} strokeWidth="2" />
      <SunAccent x={8} y={4.1} />
    </IconBase>
  );
}
