export default function SearchBar({ value, onChange, placeholder = "Buscar...", id }) {
  return (
    <div className="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="#9ca3af" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
