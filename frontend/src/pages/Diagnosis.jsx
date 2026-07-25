import { useRef, useState } from "react";

export default function Diagnosis({ onOpenChat, onHome }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  const choose = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };
  return (
    <main className="page-shell narrow-page">
      <button className="back-button" onClick={onHome}>← Back to Home</button>
      <section className="panel diagnosis-panel">
        <span className="eyebrow">AI IMAGE DIAGNOSIS</span><h1>Analyse a vehicle photo</h1><p>Upload a dashboard warning, tyre, engine bay or damage photo. Then continue in AI Chat for analysis.</p>
        <div className="diagnosis-drop" onClick={() => inputRef.current?.click()}>{preview ? <img src={preview} alt="Vehicle upload" /> : <span>Click to select an image</span>}</div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={choose} />
        <button className="gold-button full-button" onClick={onOpenChat}>Continue to AI Chat</button>
      </section>
    </main>
  );
}
