import { useState } from "react";
import "./ServiceCentres.css";

const QUICK_SEARCHES = [
  "Car workshop", "Car repair", "Vehicle servicing", "Engine repair",
  "Gearbox repair", "Brake repair", "Tyre shop", "Car aircon repair",
  "Accident repair", "Spray painting", "Car detailing", "Car wash", "Towing"
];

function buildGoogleMapsUrl(query, location) {
  const locationText = location ? ` near ${location}` : " in Singapore";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query}${locationText}`)}`;
}

export default function ServiceCentres({ onHome }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const openResults = (searchTerm = query) => {
    const finalQuery = searchTerm.trim() || "Car workshop";
    window.open(buildGoogleMapsUrl(finalQuery, area.trim()), "_blank", "noopener,noreferrer");
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser. You can enter an area instead.");
      return;
    }

    setLocationMessage("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = `${coords.latitude},${coords.longitude}`;
        setArea(coordinates);
        setLocationMessage("Location added. Google Maps will show workshops near you.");
      },
      () => setLocationMessage("Location permission was not granted. Enter an area such as Tampines or Jurong."),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <main className="service-centres-page">
      <div className="service-centres-shell">
        <button type="button" className="service-back" onClick={onHome}>← Back to Home</button>

        <section className="service-live-hero">
          <span className="service-eyebrow">LIVE GOOGLE MAPS SEARCH</span>
          <h1>Find a Car Workshop</h1>
          <p>Search current car-repair and automotive-service businesses across Singapore. Results open in Google Maps with live ratings, opening hours, calls and directions.</p>
        </section>

        <section className="service-live-search">
          <label>
            What service do you need?
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") openResults(); }}
              placeholder="Search for a car workshop or service"
            />
          </label>

          <label>
            Area or location <small>(Optional)</small>
            <input
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="Example: Tampines, Jurong, Woodlands"
            />
          </label>

          <div className="service-live-actions">
            <button type="button" className="service-location-button" onClick={useLocation}>Use My Location</button>
            <button type="button" className="service-primary-action" onClick={() => openResults()}>Search Google Maps</button>
          </div>
          {locationMessage && <p className="service-location-message">{locationMessage}</p>}
        </section>

        <section className="service-quick-section">
          <div className="service-results-heading">
            <div><span className="service-eyebrow">POPULAR SEARCHES</span><h2>Choose a Service</h2></div>
            <p>These shortcuts search live Google Maps listings. No workshop, rating or opening time is hardcoded in this app.</p>
          </div>
          <div className="service-quick-grid">
            {QUICK_SEARCHES.map((item) => (
              <button key={item} type="button" onClick={() => { setQuery(item); openResults(item); }}>
                <span>{item.slice(0, 2).toUpperCase()}</span>
                <strong>{item}</strong>
                <small>View live results →</small>
              </button>
            ))}
          </div>
        </section>

        <section className="service-disclaimer">
          <strong>Before booking</strong>
          <p>Compare recent reviews and quotations, and confirm the workshop’s experience, warranty terms, address and opening hours directly.</p>
        </section>
      </div>
    </main>
  );
}
