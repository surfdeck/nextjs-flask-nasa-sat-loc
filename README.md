NASA Goddard Space Flight Center App

Overview

This application is an interactive visualization tool designed to display satellite trajectories and their relationship to Earth, powered by NASA Goddard Space Flight Center's SSC Web Services. Users can input parameters to view satellite positions in a 3D environment.

Features

3D Satellite Visualization
Real-time rendering of satellite positions using Three.js.
Dynamic Earth and Moon with satellite orbits.
Labels for satellites and locations of interest, such as NASA’s Goddard Space Flight Center.
Satellite Descriptions
Displays details about selected satellites:
ACE: Observes particles from solar, interstellar, and galactic origins.
WIND: Studies solar wind effects on Earth's magnetosphere.
GOES-16 & GOES-17: Monitors weather phenomena and hazards across the Western Hemisphere (coming soon).
Customizable Parameters
Define start and end times for trajectory visualization.
Choose coordinate systems (e.g., GSE, GEO) and resolution factors.
Requirements

Frontend
React with Next.js for dynamic UI.
Three.js for 3D rendering.
Tailwind CSS for responsive and modern UI design.
Backend
Flask for API integration with NASA’s SSC Web Services.
Python with requests, Flask-CORS, and dotenv libraries.
How It Works

Frontend Input: Users select satellites, input time ranges, and define visualization parameters.
Backend Query: Flask queries NASA’s SSC Web Services API to fetch satellite location data.
3D Visualization: The frontend renders Earth, satellites, and labels using Three.js.
Setup Instructions

1. Clone the Repository
git clone https://github.com/nasa-goddard/space-app.git
cd space-app
2. Configure Backend
Create a .env file in the project root and include your NASA API credentials:

NASA_SSC_API_URL=https://sscweb.gsfc.nasa.gov/WS/sscr/2
Install Python dependencies and run the Flask server:

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Start the Flask backend
python app.py
3. Configure Frontend
Install Node.js dependencies and start the Next.js development server:

npm install
npm run dev
Usage

Flask API
The Flask server exposes the following endpoint:

GET /api/get-satellite-locations:
Accepts parameters such as observatories, start_time, end_time, and coordinate_system.
Returns vertices and labels for visualization.
Example Request
curl -X GET "http://localhost:5328/api/get-satellite-locations?observatories=ace,wind&start_time=20240101T000000Z&end_time=20240101T010000Z&coordinate_system=GSE"

Technologies Used

Frontend
Next.js: React framework for rendering the UI.
Three.js: For rendering 3D objects and animations.
Tailwind CSS: Utility-first CSS framework for styling.
Backend
Flask: Lightweight Python framework for the API layer.
NASA SSC Web Services: For satellite trajectory data.
Python Libraries: requests, Flask-CORS, and dotenv.
Deployment

Frontend
Deploy the Next.js app to platforms such as Vercel.

Backend
Deploy the Flask API to serverless platforms like Vercel or AWS Lambda.

Acknowledgements

Special thanks to:

NASA Goddard Space Flight Center for providing SSC Web Services.
Flask for enabling the backend infrastructure.
Three.js for creating stunning 3D visualizations.
This project demonstrates the integration of NASA's APIs with modern web technologies to create a visually engaging and informative satellite visualization experience.
