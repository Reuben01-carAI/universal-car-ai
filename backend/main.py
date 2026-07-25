import base64
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from supabase import Client, create_client


# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

openai_api_key = os.getenv("OPENAI_API_KEY")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not openai_api_key:
    raise RuntimeError("OPENAI_API_KEY is missing from backend/.env")

if not supabase_url:
    raise RuntimeError("SUPABASE_URL is missing from backend/.env")

if not supabase_key:
    raise RuntimeError("SUPABASE_KEY is missing from backend/.env")


# ---------------------------------------------------------
# Clients
# ---------------------------------------------------------

openai_client = OpenAI(api_key=openai_api_key)

supabase: Client = create_client(
    supabase_url,
    supabase_key,
)


def normalise_user_id(value: str | None) -> str:
    """Return a safe anonymous browser identifier."""
    candidate = (value or "").strip()[:100]
    if not candidate:
        return "anonymous-demo-user"
    return "".join(ch for ch in candidate if ch.isalnum() or ch in "-_") or "anonymous-demo-user"


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(title="Universal Car AI Assistant")

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

allowed_origins = [
    "https://universal-car-ai.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Request models
# ---------------------------------------------------------

class QuestionRequest(BaseModel):
    question: str
    history: list[dict[str, Any]] = Field(default_factory=list)


class VehicleProfileRequest(BaseModel):
    make: str | None = None
    model: str | None = None
    year: int | None = None
    fuel_type: str | None = None
    mileage: int | None = None
    registration_number: str | None = None
    vin: str | None = None
    usage_type: str | None = None



class VehicleHealthRecordRequest(BaseModel):
    system_type: str
    status: str | None = None
    notes: str | None = None

    service_date: str | None = None
    service_mileage: int | None = None

    warning_light: bool | None = None
    fault_codes: str | None = None

    battery_voltage: float | None = None
    battery_age_months: int | None = None

    front_tyre_tread_mm: float | None = None
    rear_tyre_tread_mm: float | None = None
    front_tyre_pressure_psi: float | None = None
    rear_tyre_pressure_psi: float | None = None
    tyre_manufacture_year: int | None = None

    front_brake_pad_mm: float | None = None
    rear_brake_pad_mm: float | None = None
    brake_fluid_date: str | None = None

    coolant_level: str | None = None
    coolant_change_date: str | None = None


# ---------------------------------------------------------
# Supabase conversation-memory functions
# ---------------------------------------------------------

def load_saved_memory(user_id: str, limit: int = 30) -> list[dict[str, str]]:
    """
    Load the latest saved conversation messages from Supabase.
    """

    result = (
        supabase
        .table("car_memory")
        .select("role,content,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    rows = result.data or []

    # Supabase returns newest first.
    # OpenAI needs oldest first.
    rows.reverse()

    messages: list[dict[str, str]] = []

    for row in rows:
        role = row.get("role")
        content = row.get("content")

        if role in {"user", "assistant"} and content:
            messages.append(
                {
                    "role": role,
                    "content": content,
                }
            )

    return messages


def save_message(user_id: str, role: str, content: str) -> None:
    """
    Save one user or assistant message into Supabase.
    """

    supabase.table("car_memory").insert(
        {
            "user_id": user_id,
            "role": role,
            "content": content,
        }
    ).execute()


# ---------------------------------------------------------
# Vehicle profile functions
# ---------------------------------------------------------

def get_vehicle_profile(user_id: str) -> dict[str, Any] | None:
    """
    Get the user's primary vehicle profile.
    """

    result = (
        supabase
        .table("vehicle_profiles")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_primary", True)
        .limit(1)
        .execute()
    )

    rows = result.data or []

    if rows:
        return rows[0]

    return None


def save_vehicle_profile(
    user_id: str,
    make: str | None,
    model: str | None,
    year: int | None,
    fuel_type: str | None,
    mileage: int | None,
    registration_number: str | None,
    vin: str | None,
    usage_type: str | None,
) -> dict[str, Any]:
    """
    Create or update the user's primary vehicle profile.
    """

    existing_profile = get_vehicle_profile(user_id)

    profile_data = {
        "user_id": user_id,
        "make": make,
        "model": model,
        "year": year,
        "fuel_type": fuel_type,
        "mileage": mileage,
        "registration_number": registration_number,
        "vin": vin,
        "usage_type": usage_type,
        "is_primary": True,
    }

    if existing_profile:
        result = (
            supabase
            .table("vehicle_profiles")
            .update(profile_data)
            .eq("id", existing_profile["id"])
            .execute()
        )
    else:
        result = (
            supabase
            .table("vehicle_profiles")
            .insert(profile_data)
            .execute()
        )

    rows = result.data or []

    if rows:
        return rows[0]

    saved_profile = get_vehicle_profile(user_id)

    if saved_profile:
        return saved_profile

    raise RuntimeError("Vehicle profile could not be saved.")


def format_vehicle_profile(
    profile: dict[str, Any] | None,
) -> str:
    """
    Convert the vehicle profile into text for the AI.
    """

    if not profile:
        return "No structured vehicle profile has been saved yet."

    return f"""
Saved vehicle profile:

Make: {profile.get("make") or "Unknown"}
Model: {profile.get("model") or "Unknown"}
Year: {profile.get("year") or "Unknown"}
Fuel type: {profile.get("fuel_type") or "Unknown"}
Mileage: {profile.get("mileage") or "Unknown"}
Registration number: {profile.get("registration_number") or "Unknown"}
VIN: {profile.get("vin") or "Unknown"}
Usage type: {profile.get("usage_type") or "Unknown"}
""".strip()


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------



def blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return value


def get_vehicle_health_records(user_id: str) -> list[dict[str, Any]]:
    result = (
        supabase
        .table("vehicle_health_records")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data or []


def save_vehicle_health_record(
    user_id: str,
    data: VehicleHealthRecordRequest,
) -> dict[str, Any]:
    system_type = data.system_type.strip().lower()

    record_data = {
        "user_id": user_id,
        "system_type": system_type,
        "status": blank_to_none(data.status),
        "notes": blank_to_none(data.notes),
        "service_date": blank_to_none(data.service_date),
        "service_mileage": data.service_mileage,
        "warning_light": data.warning_light,
        "fault_codes": blank_to_none(data.fault_codes),
        "battery_voltage": data.battery_voltage,
        "battery_age_months": data.battery_age_months,
        "front_tyre_tread_mm": data.front_tyre_tread_mm,
        "rear_tyre_tread_mm": data.rear_tyre_tread_mm,
        "front_tyre_pressure_psi": data.front_tyre_pressure_psi,
        "rear_tyre_pressure_psi": data.rear_tyre_pressure_psi,
        "tyre_manufacture_year": data.tyre_manufacture_year,
        "front_brake_pad_mm": data.front_brake_pad_mm,
        "rear_brake_pad_mm": data.rear_brake_pad_mm,
        "brake_fluid_date": blank_to_none(data.brake_fluid_date),
        "coolant_level": blank_to_none(data.coolant_level),
        "coolant_change_date": blank_to_none(data.coolant_change_date),
    }

    existing = (
        supabase
        .table("vehicle_health_records")
        .select("id")
        .eq("user_id", user_id)
        .eq("system_type", system_type)
        .limit(1)
        .execute()
    )

    existing_rows = existing.data or []

    if existing_rows:
        result = (
            supabase
            .table("vehicle_health_records")
            .update(record_data)
            .eq("id", existing_rows[0]["id"])
            .execute()
        )
    else:
        result = (
            supabase
            .table("vehicle_health_records")
            .insert(record_data)
            .execute()
        )

    rows = result.data or []

    if rows:
        return rows[0]

    saved = (
        supabase
        .table("vehicle_health_records")
        .select("*")
        .eq("user_id", user_id)
        .eq("system_type", system_type)
        .limit(1)
        .execute()
    )

    saved_rows = saved.data or []
    if saved_rows:
        return saved_rows[0]

    raise RuntimeError("Vehicle health record could not be saved.")


@app.get("/vehicle-health")
def read_vehicle_health_records(x_user_id: str | None = Header(default=None)):
    user_id = normalise_user_id(x_user_id)
    try:
        return {
            "vehicle_health_records": get_vehicle_health_records(user_id),
        }
    except Exception as error:
        print("Vehicle health read error:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Vehicle health records could not be loaded.",
        )


@app.post("/vehicle-health")
def create_or_update_vehicle_health_record(
    data: VehicleHealthRecordRequest,
    x_user_id: str | None = Header(default=None),
):
    user_id = normalise_user_id(x_user_id)
    if not data.system_type.strip():
        raise HTTPException(
            status_code=400,
            detail="system_type is required.",
        )

    try:
        record = save_vehicle_health_record(user_id, data)
        return {
            "message": "Vehicle health record saved successfully.",
            "vehicle_health_record": record,
        }
    except Exception as error:
        print("Vehicle health save error:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="The vehicle health record could not be saved.",
        )

@app.get("/")
def home():
    return {
        "message": "Universal Car AI Backend Running",
        "memory": "Supabase connected",
        "vehicle_profile": "Vehicle profile system ready",
    }


@app.get("/vehicle-profile")
def read_vehicle_profile(x_user_id: str | None = Header(default=None)):
    user_id = normalise_user_id(x_user_id)
    """
    Read the user's saved primary vehicle.
    """

    try:
        profile = get_vehicle_profile(user_id)

        return {
            "vehicle_profile": profile,
        }

    except Exception as error:
        print("Vehicle profile read error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="The vehicle profile could not be loaded.",
        )


@app.post("/vehicle-profile")
def create_or_update_vehicle_profile(
    data: VehicleProfileRequest,
    x_user_id: str | None = Header(default=None),
):
    user_id = normalise_user_id(x_user_id)
    """
    Create or update the user's primary vehicle.
    """

    try:
        profile = save_vehicle_profile(
            user_id=user_id,
            make=data.make,
            model=data.model,
            year=data.year,
            fuel_type=data.fuel_type,
            mileage=data.mileage,
            registration_number=data.registration_number,
            vin=data.vin,
            usage_type=data.usage_type,
        )

        return {
            "message": "Vehicle profile saved successfully.",
            "vehicle_profile": profile,
        }

    except Exception as error:
        print("Vehicle profile save error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="The vehicle profile could not be saved.",
        )


@app.post("/ask")
async def ask_ai(
    question: str = Form(default=""),
    history: str = Form(default="[]"),
    image: UploadFile | None = File(default=None),
    x_user_id: str | None = Header(default=None),
):
    user_id = normalise_user_id(x_user_id)
    """
    Answer a text question, analyse an uploaded image, or do both together.
    """

    question = question.strip()

    if not question and image is None:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question or upload an image.",
        )

    question_for_ai = (
        question
        or "Please analyse this vehicle image and explain what you can see."
    )

    try:
        # The frontend sends history as JSON inside FormData.
        # Parse it so malformed input is caught cleanly, while Supabase remains
        # the main long-term memory source for this local-user version.
        try:
            parsed_history = json.loads(history)

            if not isinstance(parsed_history, list):
                parsed_history = []
        except json.JSONDecodeError:
            parsed_history = []

        saved_memory = load_saved_memory(user_id)
        vehicle_profile = get_vehicle_profile(user_id)
        vehicle_profile_text = format_vehicle_profile(vehicle_profile)

        user_content: list[dict[str, Any]] = [
            {
                "type": "input_text",
                "text": question_for_ai,
            }
        ]

        if image is not None:
            allowed_image_types = {
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
            }

            if image.content_type not in allowed_image_types:
                raise HTTPException(
                    status_code=400,
                    detail="Please upload a JPG, PNG, WEBP or GIF image.",
                )

            image_bytes = await image.read()
            maximum_file_size = 10 * 1024 * 1024

            if not image_bytes:
                raise HTTPException(
                    status_code=400,
                    detail="The uploaded image is empty.",
                )

            if len(image_bytes) > maximum_file_size:
                raise HTTPException(
                    status_code=400,
                    detail="The image must be smaller than 10 MB.",
                )

            encoded_image = base64.b64encode(image_bytes).decode("utf-8")
            image_data_url = (
                f"data:{image.content_type};base64,{encoded_image}"
            )

            user_content.append(
                {
                    "type": "input_image",
                    "image_url": image_data_url,
                    "detail": "auto",
                }
            )

        input_messages = [
            *saved_memory,
            {
                "role": "user",
                "content": user_content,
            },
        ]

        response = openai_client.responses.create(
            model="gpt-4.1-mini",
            instructions=f"""
You are Universal Car AI, a professional Singapore car assistant.

You are an expert on all major car brands, including Toyota, Honda,
Nissan, Mazda, Mitsubishi, Suzuki, Hyundai, Kia, BMW, Mercedes-Benz,
Audi, Volkswagen, Porsche, Ferrari, Lamborghini, McLaren, Tesla and BYD.

Here is the user's structured vehicle profile:

{vehicle_profile_text}

Use the saved vehicle profile whenever the user asks about their car.

Help users with:

- Car maintenance
- Engine problems
- Gearbox problems
- Brake issues
- Suspension
- Tyres
- Battery
- Air conditioning
- Warning lights
- Buying and selling used cars
- COE
- Depreciation
- Insurance
- Road tax
- PHV advice
- Fuel economy
- Hybrid vehicles
- Electric vehicles
- Workshop advice
- Vehicle image diagnosis
- Dashboard warning-light identification
- Tyre wear and visible damage assessment
- Engine-bay and body-damage observations

You also have access to previous conversation messages supplied in the input.

Use previous messages to remember facts the user has told you,
including preferences, maintenance history and favourite cars.

When the user says to remember something, confirm that you have remembered it.

If asked about something the user previously told you, use the saved
conversation and structured vehicle profile to answer accurately.

When analysing an image:

- Describe only what is actually visible.
- Clearly state when the image is unclear or insufficient.
- Do not claim certainty from a photo alone.
- Separate visible observations from possible causes.
- Never pretend that a photo replaces an in-person mechanical inspection.
- For warning lights, explain the likely meaning and recommended next step.
- For tyres, brakes, leaks, overheating, smoke or accident damage, prioritise safety.

If information is missing, say that you do not know instead of inventing it.

If the problem could affect safety, advise the user not to continue driving
until the vehicle has been inspected.

Use this format when appropriate:

━━━━━━━━━━━━━━━━━━━━

🔍 VISIBLE OBSERVATIONS
• What can be seen in the uploaded image

🔍 POSSIBLE CAUSES
• Cause 1
• Cause 2
• Cause 3

🛠 RECOMMENDED ACTION
• Step 1
• Step 2
• Step 3

⚠ SAFETY ADVICE
Explain whether it is safe to continue driving.

❓ FOLLOW-UP QUESTIONS
Ask only questions needed for a more accurate answer.

Rules:

- Use clear headings.
- Use bullet points.
- Keep paragraphs short.
- Never reply as one huge block of text.
- Do not use Markdown symbols such as ** or #.
- Make answers easy to read.
""",
            input=input_messages,
        )

        answer = response.output_text.strip()

        if not answer:
            raise RuntimeError("The AI returned an empty answer.")

        memory_question = question_for_ai

        if image is not None:
            memory_question = f"{question_for_ai} [Image uploaded]"

        save_message(user_id, "user", memory_question)
        save_message(user_id, "assistant", answer)

        return {
            "reply": answer,
            "image_received": image is not None,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Backend error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="The AI or database request failed.",
        )