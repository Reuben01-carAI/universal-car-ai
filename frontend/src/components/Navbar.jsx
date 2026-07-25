const navItems = [
  ["home", "Home"],
  ["chat", "AI Chat"],
  ["garage", "My Garage"],
  ["vehicle-health", "Vehicle Health"],
  ["workshops", "Workshops"],
  ["history", "Maintenance"],
];

export default function Navbar({ activePage, onNavigate }) {
  return (
    <header className="navbar">
      <button className="brand" type="button" onClick={() => onNavigate("home")}> 
        <span className="brand-mark">UC</span>
        <span><strong>Universal Car AI</strong><small>AI for every driver</small></span>
      </button>
      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={activePage === value ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate(value)}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
