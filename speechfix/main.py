import asyncio
from fastapi import FastAPI, Request, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from speechfix.services.generate_question_service import generate_interview_question

app = FastAPI(title="SpeechFix API")

BASE_DIR = Path(__file__).resolve().parent

app.mount(
    "/speechfix/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static",
)

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "score":0})


@app.get("/api/v1/questions/generate")
async def get_question(
    topic: str = Query(default="behavioral"),
    difficulty: str = Query(default="easy"),
):
    # Run the blocking Gemini SDK call in a thread pool
    # so it doesn't freeze the async event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,                           # uses default ThreadPoolExecutor
        generate_interview_question,    # function
        topic,                          # arg 1
        difficulty,                     # arg 2
    )

    if "error" in result:
        return JSONResponse(status_code=500, content=result)

    return JSONResponse(content=result)