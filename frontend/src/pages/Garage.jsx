import { useEffect, useMemo, useRef, useState } from "react";

const BRANDS = [
  "Abarth", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "BYD",
  "Chery", "Chevrolet", "Citroën", "Cupra", "Daihatsu", "Ferrari", "Fiat",
  "Ford", "Geely", "Genesis", "Honda", "Hyundai", "Infiniti", "Jaguar",
  "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", "Lotus", "Maserati",
  "Mazda", "McLaren", "Mercedes-Benz", "MG", "MINI", "Mitsubishi", "Nissan",
  "Opel", "Peugeot", "Polestar", "Porsche", "Renault", "Rolls-Royce", "SEAT",
  "Škoda", "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen",
  "Volvo", "Other"
];

export default function Garage({ profile, setProfile, onSave, loading, message }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(profile?.image_url || "");
  const [imageError, setImageError] = useState("");

  useEffect(() => setPreview(profile?.image_url || ""), [profile?.image_url]);

  const years = useMemo(() => {
    const current = new Date().getFullYear() + 1;
    return Array.from({ length: 70 }, (_, index) => current - index);
  }, []);

  const update = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageError("Please choose a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setPreview(value);
      setProfile((current) => ({ ...current, image_url: value, image_path: "local-preview" }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">MY GARAGE</span>
        <h1>Vehicle Profile</h1>
        <p>Add any vehicle. These details personalise AI answers and Vehicle Health guidance.</p>
      </div>

      <section className="garage-layout">
        <article className="panel vehicle-photo-panel">
          <div className={`vehicle-photo ${preview ? "has-photo" : ""}`}>
            {preview ? (
              <img src={preview} alt="Uploaded vehicle" />
            ) : (
              <div className="vehicle-upload-empty">
                <strong>Upload Vehicle Photo</strong>
                <span>JPG, PNG or WEBP</span>
                <small>Maximum 10 MB</small>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage} />
          <button type="button" className="secondary-button full-button" onClick={() => inputRef.current?.click()}>
            {preview ? "Change Vehicle Photo" : "Choose Vehicle Photo"}
          </button>
          {imageError && <p className="form-message error-message">{imageError}</p>}
        </article>

        <form className="panel profile-form" onSubmit={(event) => { event.preventDefault(); onSave(profile); }}>
          <div className="form-grid">
            <label>
              Brand
              <select name="make" value={profile.make || ""} onChange={update}>
                <option value="">Select brand</option>
                {BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>

            <label>
              Model
              <input name="model" value={profile.model || ""} onChange={update} placeholder="Enter vehicle model" />
            </label>

            <label>
              Year
              <select name="year" value={profile.year || ""} onChange={update}>
                <option value="">Select year</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>

            <label>
              Mileage (km)
              <input name="mileage" type="number" min="0" value={profile.mileage || ""} onChange={update} placeholder="Enter current mileage" />
            </label>

            <label>
              Fuel Type
              <select name="fuel_type" value={profile.fuel_type || ""} onChange={update}>
                <option value="">Select fuel type</option>
                <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Plug-in Hybrid</option><option>Electric</option><option>Other</option>
              </select>
            </label>

            <label>
              Usage
              <select name="usage_type" value={profile.usage_type || ""} onChange={update}>
                <option value="">Select usage</option>
                <option>Personal</option><option>PHV / Ride-hailing</option><option>Company</option><option>Commercial</option><option>Delivery</option><option>Other</option>
              </select>
            </label>

            <label>
              Registration Number <small>(Optional)</small>
              <input name="registration_number" value={profile.registration_number || ""} onChange={update} placeholder="Enter vehicle number" />
            </label>

            <label>
              VIN <small>(Optional)</small>
              <input name="vin" value={profile.vin || ""} onChange={update} placeholder="Vehicle Identification Number" />
            </label>
          </div>

          <button className="gold-button full-button" disabled={loading}>
            {loading ? "Saving..." : "Save Vehicle"}
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
    </main>
  );
}
