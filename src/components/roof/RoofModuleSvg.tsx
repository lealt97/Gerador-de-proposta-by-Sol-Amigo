interface RoofModuleSvgProps {
  color?: string;
  label?: string;
  className?: string;
}

/**
 * Símbolo vetorial do módulo fotovoltaico usado na planimetria.
 *
 * Regra visual:
 * - preto: fixo, preservado para manter leitura e identidade do símbolo;
 * - amarelo/acento: substituído pela cor da string.
 */
export function RoofModuleSvg({ color = '#B8B608', label, className = '' }: RoofModuleSvgProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.93432 14.0423L0.770895 1.79815V30.2416H15.2291V1.77802L7.93432 14.0423ZM16 31H0V0H16V31Z"
        fill="#000000"
      />
      <path
        d="M0.770895 1.79815V30.2416H15.2291V1.77802L7.93432 14.0423L0.770895 1.79815Z"
        fill={color}
      />
      {label && (
        <text
          x="8"
          y="29"
          textAnchor="middle"
          fontSize="3"
          fontFamily="Arial, sans-serif"
          fill="#000000"
        >
          {label}
        </text>
      )}
    </svg>
  );
}
