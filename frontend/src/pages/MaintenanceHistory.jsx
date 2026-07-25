import { useMemo, useState } from "react";
import "./MaintenanceHistory.css";

const STORAGE_KEY = "universal-car-ai-maintenance-history";
const emptyEntry = { category: "Engine Oil", date: "", mileage: "", cost: "", workshop: "", notes: "" };

function loadEntries() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export default function MaintenanceHistory({ profile, onHome }) {
  const [entries, setEntries] = useState(loadEntries);
  const [form, setForm] = useState(emptyEntry);
  const [showForm, setShowForm] = useState(false);

  const saveEntries = (next) => { setEntries(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const submit = (event) => {
    event.preventDefault();
    if (!form.date) return;
    saveEntries([{ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...entries]);
    setForm(emptyEntry); setShowForm(false);
  };
  const total = useMemo(() => entries.reduce((sum, item) => sum + (Number(item.cost) || 0), 0), [entries]);

  return (
    <main className="maintenance-page">
      <div className="maintenance-container">
        <button className="mh-back" onClick={onHome}>← Back to Home</button>
        <section className="mh-hero"><div><span>MAINTENANCE RECORDS</span><h1>Service History</h1><p>Track completed work for {[profile?.year, profile?.make, profile?.model].filter(Boolean).join(" ") || "your vehicle"}.</p></div><button onClick={() => setShowForm(true)}>+ Add Record</button></section>
        <section className="mh-summary"><article><span>Total records</span><strong>{entries.length}</strong></article><article><span>Total recorded spend</span><strong>S${total.toLocaleString()}</strong></article><article><span>Latest mileage</span><strong>{entries.find((item) => item.mileage)?.mileage ? `${Number(entries.find((item) => item.mileage).mileage).toLocaleString()} km` : "Not recorded"}</strong></article></section>
        <section className="mh-list">
          {!entries.length && <article className="mh-empty"><h2>No service records yet</h2><p>Add engine oil, gearbox oil, tyres, brakes, battery or other completed work.</p></article>}
          {entries.map((entry) => <article className="mh-record" key={entry.id}><div className="mh-date"><strong>{new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}</strong><small>{new Date(`${entry.date}T00:00:00`).getFullYear()}</small></div><div><span>{entry.category}</span><h3>{entry.workshop || "Workshop not recorded"}</h3><p>{entry.notes || "No additional notes."}</p></div><div className="mh-meta"><strong>{entry.mileage ? `${Number(entry.mileage).toLocaleString()} km` : "Mileage —"}</strong><small>{entry.cost ? `S$${Number(entry.cost).toLocaleString()}` : "Cost —"}</small><button onClick={() => saveEntries(entries.filter((item) => item.id !== entry.id))}>Delete</button></div></article>)}
        </section>
      </div>
      {showForm && <div className="mh-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}><form onSubmit={submit}><div className="mh-form-head"><div><span>NEW RECORD</span><h2>Add maintenance</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Engine Oil","Gearbox Oil","Brakes","Tyres","Battery","Cooling","Air-Conditioning","Inspection","Other"].map((value) => <option key={value}>{value}</option>)}</select></label><div className="mh-form-grid"><label>Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label><label>Mileage<input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })}/></label><label>Cost (S$)<input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })}/></label><label>Workshop<input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })}/></label></div><label>Notes<textarea rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label><button className="mh-save">Save Record</button></form></div>}
    </main>
  );
}
