import { useRef, useState } from "react";

export default function Chat({ question, setQuestion, onAsk, loading, messages }) {
  const fileRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return window.alert("Please select an image file.");
    if (file.size > 10 * 1024 * 1024) return window.alert("Image must be smaller than 10 MB.");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    await onAsk(imageFile);
    setImageFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <main className="page-shell narrow-page">
      <div className="page-heading"><span className="eyebrow">UNIVERSAL CAR AI</span><h1>AI Assistant</h1><p>Ask a question, upload a vehicle photo, or use both together.</p></div>
      <section className="panel chat-compose">
        {preview && <img className="chat-preview" src={preview} alt="Selected vehicle" />}
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows="5" placeholder="Describe your vehicle problem or ask a car question..." />
        <div className="compose-actions">
          <input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} hidden />
          <button className="secondary-button" onClick={() => fileRef.current?.click()}>Add image</button>
          <button className="gold-button" disabled={loading || (!question.trim() && !imageFile)} onClick={submit}>{loading ? "Thinking..." : "Ask AI"}</button>
        </div>
      </section>
      <section className="message-list">
        {!messages.length && <article className="panel empty-card"><h2>Start a conversation</h2><p>Try asking about warning lights, unusual sounds, tyres, PHV usage, maintenance or buying a car.</p></article>}
        {messages.map((message, index) => (
          <article className="panel message-card" key={`${message.question}-${index}`}>
            <span>You</span><p>{message.question}</p>{message.imageName && <small>Image: {message.imageName}</small>}<hr/><span>Universal Car AI</span><p>{message.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
