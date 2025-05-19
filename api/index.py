from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import requests
from dotenv import load_dotenv
from datetime import datetime
import sys # Import sys to configure logging

# Load environment variables (if any)
load_dotenv()

# Configure logging
# Set up basic configuration to print to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout, format='%(asctime)s - %(levelname)s - %(message)s')

# Flask application setup
app = Flask(__name__)

# Enable CORS for all domains on all routes - Adjust in production for security
CORS(app)

# Base URL for NASA SSC Web Services
NASA_SSC_API_URL = 'https://sscweb.gsfc.nasa.gov/WS/sscr/2'

@app.route("/")
def home():
    return "Flask is running!"

@app.route("/api/get-satellite-locations", methods=["GET"])
def get_satellite_locations():
    observatories_str = request.args.get("observatories", "ace,wind,goes17,goes16")
    start_time_str = request.args.get("start_time") # Make required, no default
    end_time_str = request.args.get("end_time")   # Make required, no default
    coordinate_system = request.args.get("coordinate_system", "GSE")
    resolution_factor = request.args.get("resolution_factor", "5")

    # --- Robust Time Validation and Parsing ---
    # Expected format from frontend (YYYYMMDDTHHMMSSZ)
    time_format = "%Y%m%dT%H%M%SZ"

    if not start_time_str or not end_time_str:
        logging.error("Missing start_time or end_time.")
        return jsonify({"error": "Missing start_time or end_time parameters. Expected format YYYYMMDDTHHMMSSZ."}), 400

    try:
        # Attempt to parse the provided time strings
        datetime.strptime(start_time_str, time_format)
        datetime.strptime(end_time_str, time_format)
    except ValueError:
        logging.error(f"Invalid time format. Expected {time_format}.")
        return jsonify({"error": f"Invalid time format. Expected {time_format}."}), 400
    # --- End Time Validation ---


    # Validate coordinate system (Optional but good practice)
    supported_systems = ["GSE", "GEO", "GSM", "SM", "MAG", "LGM", "RTN", "RTP", "GSEQ"] # Add more if needed
    if coordinate_system.upper() not in supported_systems:
         logging.warning(f"Unsupported coordinate system requested: {coordinate_system}. Using default GSE.")
         # Optionally return an error instead of defaulting
         # return jsonify({"error": f"Unsupported coordinate system '{coordinate_system}'. Supported systems: {', '.join(supported_systems)}."}), 400
         coordinate_system = "GSE" # Default if unsupported


    url = f"{NASA_SSC_API_URL}/locations/{observatories_str}/{start_time_str},{end_time_str}/{coordinate_system.upper()}/" # Ensure system is uppercase for API
    params = {"resolutionFactor": resolution_factor}
    headers = {"Accept": "application/json"}

    try:
        logging.info(f"Requesting satellite data from NASA SSC: {url} with params {params}")
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()

        vertices, labels = [], []

        # --- Safer Data Extraction Logic ---
        # The NASA SSC response structure can be deeply nested and sometimes inconsistent.
        # We need to safely navigate it.
        # Expected structure often involves nested lists/dicts like:
        # [envelope, { "Result": [envelope, { "Data": [envelope, [list_of_satellites]] }] }]

        try:
            list_of_satellites = None
            if isinstance(data, list) and len(data) > 1:
                result_data = data[1]
                if isinstance(result_data, dict) and "Result" in result_data and isinstance(result_data["Result"], list) and len(result_data["Result"]) > 1:
                    data_section = result_data["Result"][1]
                    if isinstance(data_section, dict) and "Data" in data_section and isinstance(data_section["Data"], list) and len(data_section["Data"]) > 1:
                        # This should be the list of satellites
                        list_of_satellites = data_section["Data"][1]

            if list_of_satellites is None or not isinstance(list_of_satellites, list):
                 logging.warning("Could not find the list of satellites in the NASA response.")
                 logging.debug(f"NASA response structure: {data}") # Log the full response for debugging
                 # Return empty data but not a 500 error, as the API call itself succeeded
                 return jsonify({"vertices": [], "labels": [], "message": "Could not parse satellite data from NASA response."})


            for satellite_block in list_of_satellites:
                # Each satellite block is typically [envelope, {satellite_details}]
                if isinstance(satellite_block, list) and len(satellite_block) > 1 and isinstance(satellite_block[1], dict):
                    satellite_details = satellite_block[1]
                    satellite_id = satellite_details.get("Id", "Unknown Satellite")

                    # Safely extract coordinates
                    coordinates_block = satellite_details.get("Coordinates")
                    if coordinates_block and isinstance(coordinates_block, list) and len(coordinates_block) > 1 and isinstance(coordinates_block[1], list) and len(coordinates_block[1]) > 0 and isinstance(coordinates_block[1][0], list) and len(coordinates_block[1][0]) > 1 and isinstance(coordinates_block[1][0][1], dict):
                        coords_data = coordinates_block[1][0][1] # This should be the {"X":[...], "Y":[...], "Z":[...]} dict

                        x_vals_block = coords_data.get("X")
                        y_vals_block = coords_data.get("Y")
                        z_vals_block = coords_data.get("Z")

                        # Safely extract the list of values
                        x_vals = x_vals_block[1] if isinstance(x_vals_block, list) and len(x_vals_block) > 1 and isinstance(x_vals_block[1], list) else []
                        y_vals = y_vals_block[1] if isinstance(y_vals_block, list) and len(y_vals_block) > 1 and isinstance(y_vals_block[1], list) else []
                        z_vals = z_vals_block[1] if isinstance(z_vals_block, list) and len(z_vals_block) > 1 and isinstance(z_vals_block[1], list) else []


                        # Ensure all coordinate lists have the same length
                        min_len = min(len(x_vals), len(y_vals), len(z_vals))

                        if min_len > 0:
                             for i in range(min_len):
                                try:
                                    # Scale coordinates from meters to kilometers (or Earth radii, common in space physics visualization)
                                    # 1e6 meters = 1000 km. Earth radius is ~6371 km. Scaling by 1e6 seems to scale to millions of meters, effectively kilometers.
                                    # Let's stick to scaling by 1e6 as per original code, assuming it means kilometers.
                                    x = float(x_vals[i]) / 1e6
                                    y = float(y_vals[i]) / 1e6
                                    z = float(z_vals[i]) / 1e6
                                    vertices.append([x, y, z])
                                    labels.append(satellite_id) # Label per vertex
                                except (ValueError, TypeError):
                                    logging.warning(f"Skipping invalid coordinate data point for {satellite_id} at index {i}.")
                        else:
                             logging.warning(f"No valid coordinate data found for satellite: {satellite_id}")
                    else:
                         logging.warning(f"Could not safely extract Coordinates for satellite: {satellite_id}")
                else:
                    logging.warning(f"Skipping malformed satellite block in NASA response: {satellite_block}")


        except Exception as e:
            logging.error(f"Error during NASA response parsing: {e}", exc_info=True) # Log exception details
            return jsonify({"error": "Failed to parse satellite data from NASA response."}), 500

        logging.info(f"Parsed {len(vertices)} vertices and {len(labels)} labels.")

        if not vertices:
             # Indicate that no data was found for the given parameters
             return jsonify({"vertices": [], "labels": [], "message": "No satellite data found for the specified parameters."})


        return jsonify({"vertices": vertices, "labels": labels})

    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching data from NASA SSC: {e}", exc_info=True)
        status_code = e.response.status_code if e.response is not None else 500
        return jsonify({"error": f"Failed to fetch satellite data from NASA SSC. Status: {status_code}."}), status_code
    except Exception as e:
        # Catch any other unexpected errors
        logging.error(f"Unexpected error in get_satellite_locations: {e}", exc_info=True)
        return jsonify({"error": "An unexpected server error occurred."}), 500

# Example of how to run the app (for local testing)
# if __name__ == '__main__':
#     # Use debug=True for local development to auto-reload
#     # In production, use a production-ready WSGI server like Gunicorn or uWSGI
#     app.run(debug=True)