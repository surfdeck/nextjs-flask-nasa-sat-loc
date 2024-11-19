from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import requests
from dotenv import load_dotenv

# Load environment variables (if any)
load_dotenv()

# Flask application setup
app = Flask(__name__)

# Base URL for NASA SSC Web Services
NASA_SSC_API_URL = 'https://sscweb.gsfc.nasa.gov/WS/sscr/2'

@app.route("/")
def home():
    return "Flask is running!"

@app.route("/api/get-satellite-locations", methods=["GET"])
def get_satellite_locations():
    observatories = request.args.get("observatories", "ace,wind,goes17,goes16")
    start_time = request.args.get("start_time", "20240101T000000Z")
    end_time = request.args.get("end_time", "20240101T010000Z")
    coordinate_system = request.args.get("coordinate_system", "GSE")
    resolution_factor = request.args.get("resolution_factor", "5")  # Adjust resolution

    # Validate inputs
    if len(start_time) != 16 or len(end_time) != 16:
        logging.error("Invalid time format. Expected YYYYMMDDTHHMMSSZ.")
        return jsonify({"error": "Invalid time format. Expected YYYYMMDDTHHMMSSZ."}), 400

    url = f"{NASA_SSC_API_URL}/locations/{observatories}/{start_time},{end_time}/{coordinate_system}/"
    params = {"resolutionFactor": resolution_factor}
    headers = {"Accept": "application/json"}

    try:
        logging.debug(f"Requesting satellite data: {url} with params {params}")
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        vertices, labels = [], []

        if isinstance(data, list) and len(data) >= 2:
            satellites = data[1]["Result"][1]["Data"][1]
            for satellite in satellites:
                satellite_id = satellite[1].get("Id", "Unknown")
                coordinates = satellite[1]["Coordinates"][1][0][1]

                x_vals = coordinates["X"][1]
                y_vals = coordinates["Y"][1]
                z_vals = coordinates["Z"][1]

                for x, y, z in zip(x_vals, y_vals, z_vals):
                    try:
                        vertices.append([float(x) / 1e6, float(y) / 1e6, float(z) / 1e6])  # Scale
                        labels.append(satellite_id)
                    except ValueError:
                        logging.warning(f"Invalid coordinate for {satellite_id}: x={x}, y={y}, z={z}")

        logging.info(f"Parsed {len(vertices)} vertices and {len(labels)} labels.")
        return jsonify({"vertices": vertices, "labels": labels})

    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching data: {e}")
        return jsonify({"error": "Failed to fetch satellite data."}), 500
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return jsonify({"error": "Unexpected error occurred"}), 500

