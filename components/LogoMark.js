// Ilustración original (no es un logotipo oficial de ninguna institución):
// un amanecer sobre montañas, en la paleta azul marino + dorado de la app.
export default function LogoMark({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Amanecer sobre montañas"
    >
      <circle cx="32" cy="24" r="9" fill="#c9a227" />
      <g stroke="#c9a227" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="6" x2="32" y2="11" />
        <line x1="32" y1="37" x2="32" y2="42" />
        <line x1="14" y1="24" x2="19" y2="24" />
        <line x1="45" y1="24" x2="50" y2="24" />
        <line x1="19.5" y1="11.5" x2="23" y2="15" />
        <line x1="44.5" y1="11.5" x2="41" y2="15" />
      </g>
      <path d="M2 52 L20 30 L30 42 L38 32 L62 52 Z" fill="#1e3a5f" />
      <path d="M2 52 L20 30 L30 42 L26 46 L14 52 Z" fill="#14293f" />
    </svg>
  );
}
