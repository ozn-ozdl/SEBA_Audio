from flask import Flask, request, send_file, jsonify
from gtts import gTTS
import tempfile
from flask_cors import CORS  # Import CORS

# Create Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

@app.route('/text_to_speech', methods=['POST'])
def text_to_speech():
    """
    Convert input text to speech using gTTS and return the generated audio file.

    This endpoint accepts a POST request with a JSON payload that contains a 'text' key.
    The text is converted to speech using Google Text-to-Speech (gTTS), saved as an MP3 file
    in a temporary location, and then sent back to the client as a downloadable attachment.

    Returns:
        Response: A Flask response containing the audio file if successful,
                  or a JSON error message with the appropriate HTTP status code if an error occurs.
    """
    try:
        # Get JSON data from the request
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Initialize gTTS with the provided text for conversion
        speech = gTTS(text, lang='en', slow=False, tld='com')

        # Save the audio file to a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        speech_file = temp_file.name
        speech.save(speech_file)
        temp_file.close()

        # Send the generated audio file back to the client
        return send_file(speech_file, as_attachment=True, download_name="speech.mp3", mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
