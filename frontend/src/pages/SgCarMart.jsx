import { useState } from "react";

export default function SgCarMart({ onHome }) {
  const [query, setQuery] = useState("");

  const openSearch = () => {
    const trimmed = query.trim();
    const url = trimmed
      ? `https://www.sgcarmart.com/used_cars/listing.php?MOD=${encodeURIComponent(trimmed)}`
      : "https://www.sgcarmart.com/used_cars/listing.php";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="page-shell narrow-page">
      <button className="back-button" onClick={onHome}>← Back to Home</button>
      <section className="panel market-panel">
        <span className="eyebrow">MARKETPLACE SEARCH</span>
        <h1>Search sgCarMart</h1>
        <p>Search used-car listings by brand or model.</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") openSearch(); }}
          placeholder="Search by brand or model"
        />
        <button className="gold-button full-button" onClick={openSearch}>Open sgCarMart Search</button>
      </section>
    </main>
  );
}
