import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Garage from "./pages/Garage";
import Diagnosis from "./pages/Diagnosis";
import SgCarMart from "./pages/SgCarMart";
import VehicleHealth from "./pages/VehicleHealth";
import ServiceCentres from "./pages/ServiceCentres";
import MaintenanceHistory from "./pages/MaintenanceHistory";
import { askCarAI, getVehicleProfile, saveVehicleProfile } from "./services/api";

const PROFILE_KEY = "universal-car-ai-profile-fallback";
const emptyProfile = { make:"", model:"", year:"", fuel_type:"", mileage:"", registration_number:"", vin:"", usage_type:"", image_url:"", image_path:"" };

function loadLocalProfile() {
  try { return { ...emptyProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") }; }
  catch { return emptyProfile; }
}

export default function App() {
  const [page, setPage] = useState("home");
  const [profile, setProfile] = useState(loadLocalProfile);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [carSearch, setCarSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setProfileLoading(true);
        const data = await getVehicleProfile();
        if (data?.vehicle_profile) {
          const merged = { ...emptyProfile, ...loadLocalProfile(), ...data.vehicle_profile };
          setProfile(merged); localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
        }
      } catch (error) { console.warn("Backend profile unavailable; using local profile.", error); }
      finally { setProfileLoading(false); }
    })();
  }, []);

  const navigate = (nextPage) => { setPage(nextPage); window.scrollTo({ top:0, behavior:"smooth" }); };

  const handleAsk = async (imageFile = null) => {
    const text = question.trim() || (imageFile ? "Please analyse this vehicle image and explain what you can see." : "");
    if (!text || aiLoading) return;
    try {
      setAiLoading(true);
      const data = await askCarAI(text, history, imageFile);
      const answer = data?.reply || "No reply was returned.";
      setMessages((current) => [...current, { question:text, answer, imageName:imageFile?.name || "" }]);
      setHistory((current) => [...current, { role:"user", content:text }, { role:"assistant", content:answer }]);
      setQuestion(""); navigate("chat");
    } catch (error) {
      setMessages((current) => [...current, { question:text, answer:error?.message || "The AI request failed.", imageName:imageFile?.name || "" }]);
      navigate("chat");
    } finally { setAiLoading(false); }
  };

  const handleSaveProfile = async (value = profile) => {
    const complete = { ...emptyProfile, ...value };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(complete));
    setProfile(complete);
    try {
      setProfileLoading(true); setProfileMessage("");
      const payload = { make:complete.make?.trim() || null, model:complete.model?.trim() || null, year:complete.year ? Number(complete.year) : null, fuel_type:complete.fuel_type || null, mileage:complete.mileage ? Number(complete.mileage) : null, registration_number:complete.registration_number?.trim() || null, vin:complete.vin?.trim() || null, usage_type:complete.usage_type || null };
      const data = await saveVehicleProfile(payload);
      const updated = { ...complete, ...(data?.vehicle_profile || payload) };
      setProfile(updated); localStorage.setItem(PROFILE_KEY, JSON.stringify(updated)); setProfileMessage("Vehicle profile saved successfully.");
    } catch (error) { setProfileMessage("Saved locally. Backend is currently unavailable."); }
    finally { setProfileLoading(false); }
  };

  return (
    <div className="app">
      <Navbar activePage={page} onNavigate={navigate} />
      {page === "home" && <Home profile={profile} onNavigate={navigate} question={question} setQuestion={setQuestion} onAsk={handleAsk} loading={aiLoading} />}
      {page === "chat" && <Chat question={question} setQuestion={setQuestion} onAsk={handleAsk} loading={aiLoading} messages={messages} />}
      {page === "garage" && <Garage profile={profile} setProfile={setProfile} onSave={handleSaveProfile} loading={profileLoading} message={profileMessage} />}
      {page === "vehicle-health" && <VehicleHealth profile={profile} onHome={() => navigate("home")} onOpenChat={() => navigate("chat")} />}
      {page === "workshops" && <ServiceCentres profile={profile} onHome={() => navigate("home")} />}
      {page === "history" && <MaintenanceHistory profile={profile} onHome={() => navigate("home")} />}
      {page === "diagnosis" && <Diagnosis onHome={() => navigate("home")} onOpenChat={() => navigate("chat")} />}
      {page === "sgcarmart" && <SgCarMart query={carSearch} onHome={() => navigate("home")} />}
    </div>
  );
}
