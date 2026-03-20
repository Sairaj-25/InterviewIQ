import os
import io
import json
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment
from pathlib import Path

# Get the absolute path to the downloaded Vosk model directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Update this to point exactly to the new model folder you added
MODEL_PATH = os.path.join(BASE_DIR, "models", "vosk-model-en-in-0.5")

# Ensure model exists before initializing
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Vosk model not found. Please ensure the model is extracted at: {MODEL_PATH}")

# Initialize the Vosk model once when the module loads
model = Model(MODEL_PATH)


def transcribe_audio_vosk(audio_bytes: bytes) -> str:
    """
    Takes raw audio bytes (usually WebM from the browser), 
    converts them to WAV format using Pydub, and transcribes 
    using the local Vosk model.
    """
    try:
        # Load the raw bytes into a pydub AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        
        # Vosk strictly requires 16kHz, 16-bit, mono WAV audio
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        
        # Export the standardized audio to raw PCM bytes
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)
        
        # We skip the WAV header (first 44 bytes) to feed raw PCM data to Vosk
        pcm_data = wav_io.read()[44:]

        # Initialize KaldiRecognizer with the model and exact sample rate
        rec = KaldiRecognizer(model, 16000)
        
        # Process the audio chunk by chunk
        chunk_size = 4000
        for i in range(0, len(pcm_data), chunk_size):
            chunk = pcm_data[i:i+chunk_size]
            rec.AcceptWaveform(chunk)
            
        # Extract the final JSON result from Vosk
        result_json = json.loads(rec.FinalResult())
        transcript = result_json.get("text", "")
        
        return transcript

    except Exception as e:
        print(f"Error during Vosk transcription: {e}")
        return f"Transcription Failed: {str(e)}"