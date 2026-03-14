# 🎙️ SpeechFix

An AI-powered web service that captures spoken audio, transcribes it, and provides deep grammatical analysis. Built with **FastAPI**, this project leverages **AssemblyAI** for highly accurate speech-to-text and **Google Gemini** to identify grammatical mistakes, explain the errors, and suggest corrected sentences.

## 🚀 Features

* **In-Browser Recording:** Users can record their voice directly from the browser using the native Web MediaRecorder API.
* **Asynchronous Processing:** Powered by **HTMX** for seamless, single-page-application (SPA) feel without the heavy JavaScript frameworks.
* **High-Accuracy Transcription:** Uses **AssemblyAI** to convert spoken audio into raw text.
* **Intelligent Grammar Analysis:** Integrates **Google Gemini API** to analyze sentence structure, pinpoint errors, and provide educational feedback.
* **Data Persistence:** Stores transcription sessions and AI feedback in a **MySQL** database using **SQLAlchemy**.

## 🛠️ Tech Stack

### Frontend
* **HTML5 & CSS3**
* **Bootstrap 5:** For responsive UI components.
* **HTMX:** For asynchronous form submissions and DOM swapping.
* **Vanilla JavaScript:** Specifically for handling the browser's Microphone/MediaRecorder API.

### Backend
* **Python 3.10+**
* **FastAPI:** Core backend framework.
* **Uvicorn:** ASGI server.
* **Pydub:** For audio preprocessing and format conversion.
* **python-multipart:** For handling `Blob` audio uploads.

### External APIs & Storage
* **AssemblyAI API:** Speech-to-Text.
* **Google Gemini API:** LLM for grammar correction.
* **MySQL & SQLAlchemy:** Relational database and ORM.

## 🌊 Application Flow

1. **Initiate:** User clicks "Start Recording" on the frontend.
2. **Capture:** Vanilla JS requests microphone access and records speech.
3. **Compile:** User clicks "Stop Recording"; audio is packaged into a `Blob`.
4. **Transmit:** HTMX asynchronously submits the audio to the FastAPI backend.
5. **Receive & Preprocess:** FastAPI accepts the file, and `pydub` standardizes the audio format.
6. **Transcribe:** Audio is sent to AssemblyAI, returning raw text.
7. **Analyze:** Text is routed to Google Gemini for grammar evaluation.
8. **Persist:** Original text, corrections, and explanations are saved to MySQL.
9. **Render:** FastAPI returns the feedback as an HTML snippet, which HTMX seamlessly injects into the UI.
