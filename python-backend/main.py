import json
import logging
import os
import time
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv
from itertools import cycle
from prompts import get_hint_prompt, get_question_prompt
from mangum import Mangum

#Config
load_dotenv()
api_keys = os.getenv("GPT_API_KEYS", "").split(",")
if not api_keys:
    raise ValueError("GPT_API_KEYS is missing, empty, or contains empty strings in .env")
FRONTEND_URL = os.getenv("FRONTEND_URL")

openai_clients = cycle([OpenAI(api_key=key.strip(), base_url="https://models.github.ai/inference") for key in api_keys])

def get_next_client():
    return next(openai_clients)
    
app = FastAPI()
_mangum = Mangum(app, lifespan="off")

def handler(event, context):
    print("EVENT_TYPE:", type(event).__name__)
    print("EVENT_KEYS:", list(event.keys()) if isinstance(event, dict) else str(event)[:500])
    return _mangum(event, context)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_INTERVAL = 1
last_request_time = 0.0

def global_rate_limiter():
    global last_request_time
    now = time.time()
    if now - last_request_time < REQUEST_INTERVAL:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait.")
    last_request_time = now

class HintRequest(BaseModel):
    code: str
    hintType: str

class QuestionRequest(BaseModel):
    difficulty: str
    company: str
    topic: str

class Message(BaseModel):
    type: str
    code: str
    hintType: str


# GPT generation logic
async def get_gpt_response(code: str, hint_type: str) -> str:
    prompt = get_hint_prompt(code, hint_type)

    for _ in range(len(api_keys)):
        client = get_next_client()
        try:
            response = client.chat.completions.create(
                model="openai/gpt-4.1",
                messages=[
                    {"role": "system", "content": "You are a concise, supportive coding tutor. Speak directly to the student. Be brief and clear — no filler, no greetings."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000 if hint_type == "strong" else 500,
                temperature=0.5 if hint_type == "strong" else 0.7,
            )
            return response.choices[0].message.content.strip()

        except RateLimitError:
            logging.warning("Rate limit hit. Trying next API key...")
            time.sleep(0.5)  # small delay before retry
        except Exception as e:
            logging.error(f"Unexpected error with API key: {e}", exc_info=True)
            time.sleep(0.5)

    raise RuntimeError("All API keys exhausted or rate-limited.")

async def generate_question(difficulty: str, company: str, topic: str) -> str:
    prompt = get_question_prompt(difficulty, company, topic)

    for _ in range(len(api_keys)):  # Try each key once
        client = get_next_client()
        try:
            response = client.chat.completions.create(
                model="openai/gpt-4.1",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a professional technical interviewer. 
                        Return only the coding interview question — do not include explanations, hints, or solutions. 
                        Follow this exact format:

                        1. A clear description of the problem. Each sentence is on a new line.
                        2. Mention any time/space complexity constraints if relevant.
                        3. Include exactly one example, labeled as: Example 1:
                        4. Do not include any headers like 'Question:' or 'Problem:', or 'Title:'.
                        5. Do not add greetings or prefaces like 'Sure, here is...'.

                        Format all content as plain text with line breaks. Avoid Markdown or numbered lists."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=500,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()

        except RateLimitError:
            logging.warning("Rate limit hit during question gen. Trying next API key...")
            time.sleep(0.5)
        except Exception as e:
            logging.error("An unexpected error occurred during question generation:", exc_info=True)
            time.sleep(0.5)

    raise RuntimeError("All API keys exhausted or failed during question generation.")
    

# REST API endpoint
@app.post("/api/hint")
async def hint_handler(req: HintRequest):
    global_rate_limiter()
    try:
        raw = await get_gpt_response(req.code, req.hintType)
        if req.hintType == "strong":
            hints = [h.strip() for h in raw.split("|||") if h.strip()]
            if len(hints) != 4:
                hints = [raw]
            return {"hints": hints}
        else:
            return {"hint": raw}
    except Exception as e:
        logging.error(f"Generation failed: {e}", exc_info=True)
        return {"error": str(e)}
    
@app.post("/api/generate")
async def generate_handler(req: QuestionRequest):
    global_rate_limiter()
    try:
        question = await generate_question(req.difficulty, req.company, req.topic)
        return {"question": question}
    except Exception as e:
        logging.error(f"Generation failed: {e}", exc_info=True)
        return {"error": str(e)}

