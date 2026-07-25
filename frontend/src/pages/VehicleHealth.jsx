import { useEffect, useMemo, useState } from "react";
import "./VehicleHealth.css";
import { API_URL, userHeaders } from "../services/api";

function createAssessment(profile, records = []) {
  const currentYear = new Date().getFullYear();
  const year = Number(profile?.year || currentYear);
  const mileage = Number(profile?.mileage || 0);
  const age = Math.max(currentYear - year, 0);
  const usage = String(profile?.usage_type || "").toLowerCase();

  let score = 94;

  if (age >= 12) score -= 12;
  else if (age >= 8) score -= 8;
  else if (age >= 5) score -= 4;

  if (mileage >= 250000) score -= 18;
  else if (mileage >= 180000) score -= 13;
  else if (mileage >= 120000) score -= 8;
  else if (mileage >= 80000) score -= 4;

  if (
    usage.includes("phv") ||
    usage.includes("grab") ||
    usage.includes("commercial") ||
    usage.includes("delivery")
  ) {
    score -= 5;
  }

  records.forEach((record) => {
    const status = String(record?.status || "").toLowerCase();

    if (status === "urgent") score -= 16;
    else if (status === "attention") score -= 9;
    else if (status === "monitor") score -= 4;
    else if (status === "good") score += 1;

    if (record?.warning_light) score -= 8;
    if (record?.fault_codes) score -= 4;

    if (record?.system_type === "battery") {
      const voltage = Number(record?.battery_voltage);
      const batteryAge = Number(record?.battery_age_months);
      if (voltage && voltage < 12.2) score -= 7;
      else if (voltage && voltage < 12.4) score -= 3;
      if (batteryAge >= 48) score -= 5;
      else if (batteryAge >= 36) score -= 2;
    }

    if (record?.system_type === "brakes") {
      const front = Number(record?.front_brake_pad_mm);
      const rear = Number(record?.rear_brake_pad_mm);
      const lowest = [front, rear].filter((value) => value > 0);
      if (lowest.length && Math.min(...lowest) <= 2) score -= 8;
      else if (lowest.length && Math.min(...lowest) <= 4) score -= 4;
    }

    if (record?.system_type === "tyres") {
      const front = Number(record?.front_tyre_tread_mm);
      const rear = Number(record?.rear_tyre_tread_mm);
      const tread = [front, rear].filter((value) => value > 0);
      if (tread.length && Math.min(...tread) <= 1.6) score -= 10;
      else if (tread.length && Math.min(...tread) <= 3) score -= 5;
      if (record?.tyre_manufacture_year && currentYear - Number(record.tyre_manufacture_year) >= 5) score -= 4;
    }

    if (record?.system_type === "cooling" && String(record?.coolant_level).toLowerCase() === "low") {
      score -= 8;
    }
  });

  score = Math.max(30, Math.min(Math.round(score), 98));

  let label = "Good";
  let type = "good";
  if (score < 65) {
    label = "Needs attention";
    type = "danger";
  } else if (score < 82) {
    label = "Monitor";
    type = "warning";
  }

  const completedSystems = new Set(
    records.map((record) => record?.system_type).filter(Boolean)
  ).size;

  const confidence = completedSystems >= 5
    ? "High"
    : completedSystems >= 3
      ? "Moderate"
      : "Limited data";

  return { score, label, type, age, mileage, confidence, completedSystems };
}

function statusPresentation(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "good") return { label: "Good", type: "good" };
  if (normalized === "monitor") return { label: "Monitor", type: "warning" };
  if (normalized === "attention") {
    return { label: "Needs attention", type: "danger" };
  }
  if (normalized === "urgent") return { label: "Urgent", type: "danger" };

  return { label: "Information saved", type: "neutral" };
}

function formatDate(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildSystemDescription(systemType, record) {
  if (!record) return null;

  const parts = [];

  if (systemType === "battery") {
    if (record.battery_voltage !== null && record.battery_voltage !== undefined) {
      parts.push(`${record.battery_voltage}V`);
    }

    if (record.battery_age_months !== null && record.battery_age_months !== undefined) {
      parts.push(`${record.battery_age_months} months old`);
    }
  }

  if (systemType === "brakes") {
    if (record.front_brake_pad_mm !== null && record.front_brake_pad_mm !== undefined) {
      parts.push(`Front pads ${record.front_brake_pad_mm} mm`);
    }

    if (record.rear_brake_pad_mm !== null && record.rear_brake_pad_mm !== undefined) {
      parts.push(`Rear pads ${record.rear_brake_pad_mm} mm`);
    }
  }

  if (systemType === "tyres") {
    if (record.front_tyre_tread_mm !== null && record.front_tyre_tread_mm !== undefined) {
      parts.push(`Front tread ${record.front_tyre_tread_mm} mm`);
    }

    if (record.rear_tyre_tread_mm !== null && record.rear_tyre_tread_mm !== undefined) {
      parts.push(`Rear tread ${record.rear_tyre_tread_mm} mm`);
    }
  }

  if (systemType === "cooling" && record.coolant_level) {
    parts.push(`Coolant level: ${record.coolant_level}`);
  }

  if (record.service_date) parts.push(`Updated ${formatDate(record.service_date)}`);
  if (record.notes) parts.push(record.notes);
  if (record.warning_light) parts.push("Warning light reported");

  return parts.length
    ? parts.join(" • ")
    : "Information has been saved for this vehicle system.";
}

function getSystemScore(record) {
  if (!record) return 50;
  const status = String(record?.status || "").toLowerCase();
  let score = { good: 92, monitor: 72, attention: 48, urgent: 25, unknown: 55 }[status] || 58;

  if (record?.warning_light) score -= 15;
  if (record?.fault_codes) score -= 8;

  if (record?.system_type === "battery") {
    const voltage = Number(record?.battery_voltage);
    const months = Number(record?.battery_age_months);
    if (voltage && voltage < 12.2) score = Math.min(score, 42);
    else if (voltage && voltage < 12.4) score = Math.min(score, 65);
    if (months >= 48) score -= 8;
  }

  if (record?.system_type === "brakes") {
    const pads = [Number(record?.front_brake_pad_mm), Number(record?.rear_brake_pad_mm)].filter((v) => v > 0);
    if (pads.length && Math.min(...pads) <= 2) score = Math.min(score, 30);
    else if (pads.length && Math.min(...pads) <= 4) score = Math.min(score, 58);
  }

  if (record?.system_type === "tyres") {
    const tread = [Number(record?.front_tyre_tread_mm), Number(record?.rear_tyre_tread_mm)].filter((v) => v > 0);
    if (tread.length && Math.min(...tread) <= 1.6) score = Math.min(score, 25);
    else if (tread.length && Math.min(...tread) <= 3) score = Math.min(score, 55);
  }

  if (record?.system_type === "cooling" && String(record?.coolant_level).toLowerCase() === "low") {
    score = Math.min(score, 35);
  }

  return Math.max(10, Math.min(Math.round(score), 98));
}

function buildMaintenancePlan(recordsBySystem) {
  const items = [];
  const add = (system, priority, title, description, timing) => {
    items.push({ system, priority, title, description, timing });
  };

  Object.entries(recordsBySystem).forEach(([system, record]) => {
    const status = String(record?.status || "").toLowerCase();
    if (record?.warning_light || status === "urgent") {
      add(system, "URGENT", `${system[0].toUpperCase()}${system.slice(1)} diagnosis`, "A warning light or urgent condition has been recorded. Arrange a professional inspection before extended driving.", "Immediately");
    } else if (status === "attention") {
      add(system, "HIGH PRIORITY", `${system[0].toUpperCase()}${system.slice(1)} inspection`, "The saved condition requires workshop attention and confirmation.", "Within 7 days");
    } else if (status === "monitor") {
      add(system, "MONITOR", `${system[0].toUpperCase()}${system.slice(1)} follow-up`, "Recheck the recorded condition and update the measurement after further driving.", "Within 2–4 weeks");
    }
  });

  const battery = recordsBySystem.battery;
  if (!battery) add("battery", "VEHICLE HEALTH", "Battery test", "Measure resting voltage, cranking performance and remaining capacity.", "Next workshop visit");
  else if (Number(battery.battery_voltage) > 0 && Number(battery.battery_voltage) < 12.4) add("battery", "HIGH PRIORITY", "Battery and charging test", "Recorded resting voltage is below the preferred range. Test the battery and alternator output.", "Within 7 days");

  const brakes = recordsBySystem.brakes;
  const pads = brakes ? [Number(brakes.front_brake_pad_mm), Number(brakes.rear_brake_pad_mm)].filter((v) => v > 0) : [];
  if (!brakes) add("brakes", "SAFETY", "Brake inspection", "Inspect pad thickness, discs and brake-fluid condition.", "Within 5,000 km");
  else if (pads.length && Math.min(...pads) <= 4) add("brakes", "SAFETY", "Brake pad replacement planning", "The lowest recorded pad thickness is approaching replacement range.", Math.min(...pads) <= 2 ? "Immediately" : "Within 2,000 km");

  const tyres = recordsBySystem.tyres;
  const tread = tyres ? [Number(tyres.front_tyre_tread_mm), Number(tyres.rear_tyre_tread_mm)].filter((v) => v > 0) : [];
  if (!tyres) add("tyres", "SAFETY", "Tyre inspection", "Check tyre age, tread depth, pressure and uneven wear.", "As soon as practical");
  else if (tread.length && Math.min(...tread) <= 3) add("tyres", "SAFETY", "Tyre replacement planning", "Recorded tread depth is low and should be checked physically.", Math.min(...tread) <= 1.6 ? "Immediately" : "Within 2,000 km");

  if (!recordsBySystem.engine) add("engine", "ROUTINE SERVICE", "Engine oil history", "Record the last oil-service date, mileage and oil specification.", "Update now");

  const unique = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.system}-${item.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique.slice(0, 6);
}

function calculateBudget(recordsBySystem) {
  const ranges = {
    base: { sg: [180, 350], jb: [280, 550] },
    engine: { sg: [120, 1800], jb: [180, 1800] },
    transmission: { sg: [180, 2200], jb: [280, 2200] },
    battery: { sg: [180, 420], jb: [250, 650] },
    brakes: { sg: [250, 900], jb: [350, 1100] },
    tyres: { sg: [450, 1600], jb: [700, 2200] },
    cooling: { sg: [120, 1200], jb: [180, 1400] },
  };

  let sgLow = ranges.base.sg[0];
  let sgHigh = ranges.base.sg[1];
  let jbLow = ranges.base.jb[0];
  let jbHigh = ranges.base.jb[1];
  const included = [];

  Object.entries(recordsBySystem).forEach(([system, record]) => {
    const status = String(record?.status || "").toLowerCase();
    const needsBudget = status === "monitor" || status === "attention" || status === "urgent" || record?.warning_light;
    if (!needsBudget || !ranges[system]) return;
    const multiplier = status === "urgent" || record?.warning_light ? 1 : status === "attention" ? 0.75 : 0.35;
    sgLow += Math.round(ranges[system].sg[0] * multiplier);
    sgHigh += Math.round(ranges[system].sg[1] * multiplier);
    jbLow += Math.round(ranges[system].jb[0] * multiplier);
    jbHigh += Math.round(ranges[system].jb[1] * multiplier);
    included.push(system);
  });

  return {
    sg: `S$${sgLow.toLocaleString()}–S$${sgHigh.toLocaleString()}`,
    jb: `RM${jbLow.toLocaleString()}–RM${jbHigh.toLocaleString()}`,
    note: included.length ? `Includes allowances for ${included.join(", ")}.` : "Routine inspection and servicing allowance.",
  };
}

function StatusBadge({ type = "neutral", children }) {
  return (
    <span className={`v2-status v2-status-${type}`}>
      <span className="v2-status-dot" />
      {children}
    </span>
  );
}

function SystemCard({
  shortName,
  title,
  status,
  type,
  description,
  onClick,
}) {
  return (
    <article className="v2-system-card">
      <div className="v2-system-header">
        <div className="v2-system-icon">
          {shortName}
        </div>

        <StatusBadge type={type}>
          {status}
        </StatusBadge>
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <button
        type="button"
        className="v2-text-button"
        onClick={onClick}
      >
        Add information
        <span>→</span>
      </button>
    </article>
  );
}

function MaintenanceCard({
  number,
  title,
  timing,
  description,
  priority,
}) {
  return (
    <article className="v2-maintenance-card">
      <div className="v2-maintenance-number">
        {String(number).padStart(2, "0")}
      </div>

      <div className="v2-maintenance-main">
        <span>{priority}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="v2-maintenance-time">
        <small>Recommended</small>
        <strong>{timing}</strong>
      </div>
    </article>
  );
}

export default function VehicleHealth({
  profile,
  onHome,
  onOpenChat,
}) {
  const [reportReady, setReportReady] =
    useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [healthRecords, setHealthRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordsError, setRecordsError] = useState("");

  const loadHealthRecords = async () => {
    setLoadingRecords(true);
    setRecordsError("");

    try {
      const response = await fetch(`${API_URL}/vehicle-health`, { headers: userHeaders() });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail || "Vehicle health records could not be loaded."
        );
      }

      setHealthRecords(result?.vehicle_health_records || []);
    } catch (error) {
      setRecordsError(
        error?.message || "Vehicle health records could not be loaded."
      );
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadHealthRecords();
  }, []);

  const recordsBySystem = useMemo(() => {
    return healthRecords.reduce((records, record) => {
      if (record?.system_type) {
        records[String(record.system_type).toLowerCase()] = record;
      }

      return records;
    }, {});
  }, [healthRecords]);

  const emptyForm = (systemType) => ({
    system_type: systemType,
    status: "",
    notes: "",
    service_date: "",
    service_mileage: "",
    warning_light: false,
    fault_codes: "",
    battery_voltage: "",
    battery_age_months: "",
    front_tyre_tread_mm: "",
    rear_tyre_tread_mm: "",
    front_tyre_pressure_psi: "",
    rear_tyre_pressure_psi: "",
    tyre_manufacture_year: "",
    front_brake_pad_mm: "",
    rear_brake_pad_mm: "",
    brake_fluid_date: "",
    coolant_level: "",
    coolant_change_date: "",
  });

  const openSystemForm = (system) => {
    const existing = recordsBySystem[system.systemType];

    setSelectedSystem(system);
    setFormData({
      ...emptyForm(system.systemType),
      ...(existing || {}),
      system_type: system.systemType,
      service_date: existing?.service_date || "",
      brake_fluid_date: existing?.brake_fluid_date || "",
      coolant_change_date: existing?.coolant_change_date || "",
      warning_light: Boolean(existing?.warning_light),
    });
    setSaveMessage("");
  };

  const closeSystemForm = () => {
    if (saving) return;
    setSelectedSystem(null);
    setFormData({});
    setSaveMessage("");
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const numberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const converted = Number(value);
    return Number.isNaN(converted) ? null : converted;
  };

  const saveSystemInformation = async (event) => {
    event.preventDefault();
    if (!selectedSystem) return;

    setSaving(true);
    setSaveMessage("");

    const payload = {
      ...formData,
      system_type: selectedSystem.systemType,
      service_date: formData.service_date || null,
      brake_fluid_date: formData.brake_fluid_date || null,
      coolant_change_date: formData.coolant_change_date || null,
      status: formData.status || null,
      notes: formData.notes?.trim() || null,
      fault_codes: formData.fault_codes?.trim() || null,
      coolant_level: formData.coolant_level || null,
      service_mileage: numberOrNull(formData.service_mileage),
      battery_voltage: numberOrNull(formData.battery_voltage),
      battery_age_months: numberOrNull(formData.battery_age_months),
      front_tyre_tread_mm: numberOrNull(formData.front_tyre_tread_mm),
      rear_tyre_tread_mm: numberOrNull(formData.rear_tyre_tread_mm),
      front_tyre_pressure_psi: numberOrNull(formData.front_tyre_pressure_psi),
      rear_tyre_pressure_psi: numberOrNull(formData.rear_tyre_pressure_psi),
      tyre_manufacture_year: numberOrNull(formData.tyre_manufacture_year),
      front_brake_pad_mm: numberOrNull(formData.front_brake_pad_mm),
      rear_brake_pad_mm: numberOrNull(formData.rear_brake_pad_mm),
    };

    try {
      const response = await fetch(`${API_URL}/vehicle-health`, {
        method: "POST",
        headers: userHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.detail || "Could not save information.");

      setSaveMessage("Saved successfully.");
      await loadHealthRecords();

      window.setTimeout(() => {
        setSelectedSystem(null);
        setFormData({});
        setSaveMessage("");
      }, 700);
    } catch (error) {
      setSaveMessage(error?.message || "Could not save information.");
    } finally {
      setSaving(false);
    }
  };

  const assessment = useMemo(
    () => createAssessment(profile, healthRecords),
    [profile, healthRecords]
  );

  const vehicleName =
    [profile?.year, profile?.make, profile?.model]
      .filter(Boolean)
      .join(" ") || "Your Vehicle";

  const vehicleDetails = [
    profile?.fuel_type,
    profile?.usage_type,
    assessment.mileage
      ? `${assessment.mileage.toLocaleString()} km`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const systemDefinitions = [
    {
      shortName: "EN",
      systemType: "engine",
      title: "Engine",
      fallbackStatus: "No issue reported",
      fallbackType: "good",
      fallbackDescription:
        "No engine warning, symptom or confirmed fault has been recorded.",
    },
    {
      shortName: "TR",
      systemType: "transmission",
      title: "Transmission",
      fallbackStatus: "More data required",
      fallbackType: "warning",
      fallbackDescription:
        "Add service history, symptoms or diagnostic codes for a better assessment.",
    },
    {
      shortName: "BT",
      systemType: "battery",
      title: "Battery",
      fallbackStatus: "Test recommended",
      fallbackType: "warning",
      fallbackDescription:
        "Battery voltage and remaining capacity have not been recorded.",
    },
    {
      shortName: "CL",
      systemType: "cooling",
      title: "Cooling",
      fallbackStatus: "No issue reported",
      fallbackType: "good",
      fallbackDescription:
        "No overheating or coolant issue is currently recorded.",
    },
    {
      shortName: "BR",
      systemType: "brakes",
      title: "Brakes",
      fallbackStatus: "Inspection required",
      fallbackType: "neutral",
      fallbackDescription:
        "Brake pads, discs and brake fluid require a physical inspection.",
    },
    {
      shortName: "TY",
      systemType: "tyres",
      title: "Tyres",
      fallbackStatus: "Inspection required",
      fallbackType: "neutral",
      fallbackDescription:
        "Add tyre age, tread depth and pressure measurements.",
    },
  ];

  const systems = systemDefinitions.map((system) => {
    const record = recordsBySystem[system.systemType];

    if (!record) {
      return {
        ...system,
        status: system.fallbackStatus,
        type: system.fallbackType,
        description: system.fallbackDescription,
      };
    }

    const presentation = statusPresentation(record.status);

    return {
      ...system,
      status: presentation.label,
      type: presentation.type,
      description:
        buildSystemDescription(system.systemType, record) ||
        system.fallbackDescription,
    };
  });

  const maintenancePlan = useMemo(
    () => buildMaintenancePlan(recordsBySystem),
    [recordsBySystem]
  );

  const budget = useMemo(
    () => calculateBudget(recordsBySystem),
    [recordsBySystem]
  );

  const chartData = systems.map((system) => ({
    ...system,
    score: getSystemScore(recordsBySystem[system.systemType]),
    recorded: Boolean(recordsBySystem[system.systemType]),
  }));

  const statusCounts = chartData.reduce(
    (counts, system) => {
      const key = system.type === "danger" ? "Attention" : system.type === "warning" ? "Monitor" : system.type === "good" ? "Good" : "Unknown";
      counts[key] += 1;
      return counts;
    },
    { Good: 0, Monitor: 0, Attention: 0, Unknown: 0 }
  );

  return (
    <main className="vehicle-health-v2">
      <div className="v2-container">
        <button
          type="button"
          className="v2-back-button"
          onClick={onHome}
        >
          <span>←</span>
          Back to Home
        </button>

        <section className="v2-hero">
          <div className="v2-hero-content">
            <span className="v2-eyebrow">
              UNIVERSAL CAR AI
            </span>

            <h1>Vehicle Health</h1>

            <p>
              Understand what is known about your vehicle,
              what requires checking and what maintenance
              should be prioritised.
            </p>

            <div className="v2-vehicle-profile">
              <div className="v2-vehicle-logo">
                {profile?.make
                  ? profile.make
                      .slice(0, 2)
                      .toUpperCase()
                  : "UC"}
              </div>

              <div>
                <span>Current vehicle</span>
                <strong>{vehicleName}</strong>
                <small>
                  {vehicleDetails ||
                    "Complete your vehicle profile"}
                </small>
              </div>
            </div>
          </div>

          <article className="v2-score-card">
            <div className="v2-score-heading">
              <div>
                <span>Profile assessment</span>
                <h2>Estimated Health</h2>
              </div>

              <StatusBadge type={assessment.type}>
                {assessment.label}
              </StatusBadge>
            </div>

            <div className="v2-score-content">
              <div
                className="v2-score-ring"
                style={{
                  "--health-score": `${
                    assessment.score * 3.6
                  }deg`,
                }}
              >
                <div className="v2-score-centre">
                  <strong>{assessment.score}</strong>
                  <span>/100</span>
                </div>
              </div>

              <div className="v2-score-details">
                <h3>Preliminary estimate</h3>

                <p>
                  Based on vehicle age, mileage and saved
                  usage information.
                </p>

                <div>
                  <span>Confidence</span>
                  <strong>{assessment.confidence}</strong>
                </div>
              </div>
            </div>

            <div className="v2-disclaimer">
              <span>i</span>

              <p>
                This is not a live reading or confirmed
                mechanical diagnosis. The app is not yet
                connected to the vehicle computer.
              </p>
            </div>
          </article>
        </section>

        <section className="v2-summary-grid">
          <article className="v2-summary-card">
            <span className="v2-eyebrow">
              PROFILE INFORMATION
            </span>

            <h2>Assessment Data</h2>

            <div className="v2-data-list">
              <div>
                <span>Vehicle age</span>
                <strong>
                  {assessment.age} years
                </strong>
              </div>

              <div>
                <span>Mileage</span>
                <strong>
                  {assessment.mileage
                    ? `${assessment.mileage.toLocaleString()} km`
                    : "Not provided"}
                </strong>
              </div>

              <div>
                <span>Fuel type</span>
                <strong>
                  {profile?.fuel_type ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Usage</span>
                <strong>
                  {profile?.usage_type ||
                    "Not provided"}
                </strong>
              </div>
            </div>
          </article>

          <article className="v2-summary-card">
            <span className="v2-eyebrow">
              TOP PRIORITIES
            </span>

            <h2>What to Do Next</h2>

            <div className="v2-priority-list">
              <div>
                <span>01</span>
                <p>
                  Add your most recent servicing mileage.
                </p>
              </div>

              <div>
                <span>02</span>
                <p>
                  Record battery, brake and tyre inspection
                  results.
                </p>
              </div>

              <div>
                <span>03</span>
                <p>
                  Add warning lights, symptoms or unusual
                  sounds.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="v2-section">
          <div className="v2-section-heading">
            <div>
              <span className="v2-eyebrow">
                CONDITION OVERVIEW
              </span>

              <h2>Vehicle Systems</h2>
            </div>

            <p>
              Statuses below are based only on information
              currently recorded in the app.
            </p>
          </div>

          {loadingRecords && (
            <p style={{ color: "var(--muted)", marginBottom: "16px" }}>
              Loading saved vehicle information...
            </p>
          )}

          {recordsError && (
            <p style={{ color: "#ffb4b4", marginBottom: "16px" }}>
              {recordsError}
            </p>
          )}

          <div className="v2-system-grid">
            {systems.map((system) => (
              <SystemCard
                key={system.title}
                {...system}
                onClick={() => openSystemForm(system)}
              />
            ))}
          </div>
        </section>

        <section className="v2-section">
          <div className="v2-section-heading">
            <div>
              <span className="v2-eyebrow">
                PREVENTIVE CARE
              </span>

              <h2>Maintenance Plan</h2>
            </div>

            <p>
              Keep your vehicle information updated to
              receive more personalised guidance.
            </p>
          </div>

          <div className="v2-maintenance-list">
            {maintenancePlan.map((item, index) => (
              <MaintenanceCard
                key={`${item.system}-${item.title}`}
                number={index + 1}
                priority={item.priority}
                title={item.title}
                description={item.description}
                timing={item.timing}
              />
            ))}
          </div>
        </section>

        <section className="v2-section">
          <div className="v2-section-heading">
            <div>
              <span className="v2-eyebrow">LIVE ANALYTICS</span>
              <h2>Health Charts</h2>
            </div>
            <p>Calculated from the vehicle profile and saved system records.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            <article className="v2-summary-card">
              <span className="v2-eyebrow">SYSTEM HEALTH</span>
              <h2>Score by System</h2>
              <div style={{ display: "grid", gap: "16px", marginTop: "22px" }}>
                {chartData.map((system) => (
                  <div key={system.systemType}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "7px" }}>
                      <span>{system.title}</span>
                      <strong>{system.score}/100</strong>
                    </div>
                    <div style={{ height: "10px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: `${system.score}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #d9a441, #ffe09a)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="v2-summary-card">
              <span className="v2-eyebrow">RECORD COMPLETENESS</span>
              <h2>System Status Mix</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", marginTop: "22px" }}>
                {Object.entries(statusCounts).map(([label, count]) => (
                  <div key={label} style={{ padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ display: "block", opacity: 0.66, marginBottom: "7px" }}>{label}</span>
                    <strong style={{ fontSize: "28px" }}>{count}</strong>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: "18px", opacity: 0.7 }}>{assessment.completedSystems} of 6 systems contain saved information.</p>
            </article>
          </div>
        </section>

        <section className="v2-report-card" style={{ marginBottom: "24px" }}>
          <div>
            <span className="v2-eyebrow">FUTURE INTEGRATION</span>
            <h2>OBD-II Connection</h2>
            <p>
              Connect a compatible Bluetooth or Wi-Fi OBD-II adapter in a future version to read supported diagnostic trouble codes, RPM, coolant temperature, battery voltage and live sensor data.
            </p>
            <small style={{ display: "block", marginTop: "12px", opacity: 0.65 }}>
              Current status: Not connected — this screen does not claim to read live vehicle data.
            </small>
          </div>
          <button type="button" className="v2-report-button" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
            OBD Coming Soon
          </button>
        </section>

        <section className="v2-bottom-grid">
          <article className="v2-budget-card">
            <span className="v2-eyebrow">
              GENERAL GUIDANCE
            </span>

            <h2>Maintenance Budget</h2>

            <p>
              A preliminary allowance for inspections,
              servicing and common wear items. It is not a
              workshop quotation.
            </p>

            <div className="v2-budget-options">
              <div>
                <span>Singapore</span>
                <strong>{budget.sg}</strong>
                <small>{budget.note}</small>
              </div>

              <div>
                <span>Johor Bahru</span>
                <strong>{budget.jb}</strong>
                <small>{budget.note}</small>
              </div>
            </div>
          </article>

          <article className="v2-ai-card">
            <div className="v2-ai-icon">AI</div>

            <span className="v2-eyebrow">
              UNIVERSAL CAR AI
            </span>

            <h2>Improve the Assessment</h2>

            <p>
              Describe a symptom or upload a dashboard,
              tyre, engine-bay or vehicle-damage photo.
            </p>

            <button
              type="button"
              className="v2-primary-button"
              onClick={onOpenChat}
            >
              Ask AI About My Vehicle
              <span>→</span>
            </button>
          </article>
        </section>

        <section className="v2-report-card">
          <div>
            <span className="v2-eyebrow">
              VEHICLE REPORT
            </span>

            <h2>Full Vehicle Summary</h2>

            <p>
              Prepare a report containing your vehicle
              information, current priorities and
              recommended checks.
            </p>
          </div>

          <button
            type="button"
            className="v2-report-button"
            onClick={() => setReportReady(true)}
          >
            Generate Report
          </button>
        </section>


        {selectedSystem && (
          <div
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSystemForm();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              background: "rgba(2, 7, 18, 0.82)",
              backdropFilter: "blur(8px)",
            }}
          >
            <form
              onSubmit={saveSystemInformation}
              style={{
                width: "min(760px, 100%)",
                maxHeight: "88vh",
                overflowY: "auto",
                padding: "28px",
                border: "1px solid rgba(255, 200, 92, 0.28)",
                borderRadius: "22px",
                background: "linear-gradient(145deg, rgba(18, 27, 45, 0.98), rgba(7, 14, 28, 0.98))",
                boxShadow: "0 26px 80px rgba(0,0,0,0.55)",
                color: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "24px" }}>
                <div>
                  <span className="v2-eyebrow">VEHICLE HEALTH RECORD</span>
                  <h2 style={{ margin: "8px 0 6px" }}>Add {selectedSystem.title} Information</h2>
                  <p style={{ margin: 0, opacity: 0.72 }}>Enter only information you know. Leave unknown items blank.</p>
                </div>
                <button type="button" onClick={closeSystemForm} disabled={saving} style={{ width: "40px", height: "40px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer", fontSize: "20px" }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <label style={{ display: "grid", gap: "8px" }}>Status
                  <select name="status" value={formData.status || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }}>
                    <option value="">Select status</option><option value="good">Good</option><option value="monitor">Monitor</option><option value="attention">Needs attention</option><option value="urgent">Urgent</option><option value="unknown">Unknown</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "8px" }}>Last service date<input type="date" name="service_date" value={formData.service_date || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                <label style={{ display: "grid", gap: "8px" }}>Service mileage<input type="number" min="0" name="service_mileage" value={formData.service_mileage || ""} onChange={updateField} placeholder="Example: 140996" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                <label style={{ display: "grid", gap: "8px" }}>Fault or diagnostic codes<input name="fault_codes" value={formData.fault_codes || ""} onChange={updateField} placeholder="Example: P0300" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0" }}>
                <input type="checkbox" name="warning_light" checked={Boolean(formData.warning_light)} onChange={updateField} />A warning light is currently showing
              </label>

              {selectedSystem.systemType === "battery" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "18px" }}>
                  <label style={{ display: "grid", gap: "8px" }}>Battery voltage<input type="number" step="0.01" name="battery_voltage" value={formData.battery_voltage || ""} onChange={updateField} placeholder="Example: 12.6" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Battery age in months<input type="number" min="0" name="battery_age_months" value={formData.battery_age_months || ""} onChange={updateField} placeholder="Example: 24" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                </div>
              )}

              {selectedSystem.systemType === "brakes" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "18px" }}>
                  <label style={{ display: "grid", gap: "8px" }}>Front brake pad thickness (mm)<input type="number" step="0.1" min="0" name="front_brake_pad_mm" value={formData.front_brake_pad_mm || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Rear brake pad thickness (mm)<input type="number" step="0.1" min="0" name="rear_brake_pad_mm" value={formData.rear_brake_pad_mm || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Brake fluid change date<input type="date" name="brake_fluid_date" value={formData.brake_fluid_date || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                </div>
              )}

              {selectedSystem.systemType === "tyres" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px", marginBottom: "18px" }}>
                  <label style={{ display: "grid", gap: "8px" }}>Front tread depth (mm)<input type="number" step="0.1" min="0" name="front_tyre_tread_mm" value={formData.front_tyre_tread_mm || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Rear tread depth (mm)<input type="number" step="0.1" min="0" name="rear_tyre_tread_mm" value={formData.rear_tyre_tread_mm || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Front pressure (PSI)<input type="number" step="0.1" min="0" name="front_tyre_pressure_psi" value={formData.front_tyre_pressure_psi || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Rear pressure (PSI)<input type="number" step="0.1" min="0" name="rear_tyre_pressure_psi" value={formData.rear_tyre_pressure_psi || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                  <label style={{ display: "grid", gap: "8px" }}>Tyre manufacture year<input type="number" min="1990" max={new Date().getFullYear()} name="tyre_manufacture_year" value={formData.tyre_manufacture_year || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                </div>
              )}

              {selectedSystem.systemType === "cooling" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "18px" }}>
                  <label style={{ display: "grid", gap: "8px" }}>Coolant level<select name="coolant_level" value={formData.coolant_level || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }}><option value="">Select</option><option value="normal">Normal</option><option value="low">Low</option><option value="unknown">Unknown</option></select></label>
                  <label style={{ display: "grid", gap: "8px" }}>Coolant change date<input type="date" name="coolant_change_date" value={formData.coolant_change_date || ""} onChange={updateField} style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "10px" }} /></label>
                </div>
              )}

              <label style={{ display: "grid", gap: "8px" }}>Notes, symptoms or observations<textarea name="notes" rows="5" value={formData.notes || ""} onChange={updateField} placeholder="Example: Slow starting, unusual sound, workshop test result..." style={{ padding: "12px", borderRadius: "10px", resize: "vertical" }} /></label>

              {saveMessage && <p style={{ margin: "16px 0 0", color: saveMessage.includes("successfully") ? "#8de5aa" : "#ffb4b4" }}>{saveMessage}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
                <button type="button" onClick={closeSystemForm} disabled={saving} className="v2-report-button">Cancel</button>
                <button type="submit" disabled={saving} className="v2-primary-button">{saving ? "Saving..." : "Save Information"}</button>
              </div>
            </form>
          </div>
        )}

        {reportReady && (
          <div className="v2-report-ready">
            <span>✓</span>

            <div>
              <strong>
                Report preview generated
              </strong>

              <p>
                PDF download will be connected in a later
                module.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}