import io
from faster_whisper import WhisperModel
from pydub import AudioSegment

# Initialize the model

model_size = "base"
model = WhisperModel(model_size, device="cpu", comppute_type="int8")


def transcribe_audio_whisper(audio_bytes: bytes) -> str:
    """
    Converts raw audio bytes to the required format and transcribes 
    using Faster Whisper.
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
        
        # Transcribe
        segments, info = model.transcribe(wav_io, beam_size=5)

        # Combine segments into a single string
        transcript = " ".join([segment.text for segment in segments])
        return transcript.strip()
        
    except Exception as e:
        print(f"Error during Vosk transcription: {e}")
        return f"Transcription Failed: {str(e)}"