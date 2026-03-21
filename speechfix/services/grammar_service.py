import os
import json
from pathlib import Path
from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class GrammarError(BaseModel):
    original: str
    corrected: str
    explanation: str

class AnalysisResult(BaseModel):
    score: int
    score_label: str
    errors: list[GrammarError]
    corrected_text: str

def analyze_grammar(transcript: str, topic: str, difficulty: str) -> dict:
    """
    Evaluates the transcript using Gemini 1.5 Flash to provide
    a score, detailed error breakdowns, and a corrected version.
    """
    prompt = f"""
    You are an expert English teacher and technical interviewer evaluating a candidate's spoken response.
    
    Interview Context:
    - Topic: {topic}
    - Difficulty: {difficulty}
    
    Candidate's Spoken Answer (Transcribed by AI):
    "{transcript}"
    
    Evaluate the candidate's answer for grammar, clarity, and relevance to the topic.
    Provide a score from 0 to 100, identify specific grammatical or structural errors, explain why they are wrong, and provide a fully corrected, professional version of their answer.
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnalysisResult,
                temperature=0.2, 
            ),
        )
        return json.loads(response.text)

    except Exception as e:
        print(f"Error analyzing grammar: {e}")
        return {
            "score": 0,
            "score_label": "Analysis Failed",
            "errors": [],
            "corrected_text": "Unable to connect to AI for evaluation."
        }