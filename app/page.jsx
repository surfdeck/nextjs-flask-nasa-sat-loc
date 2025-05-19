'use client';

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import ThreeViewer from "./three-viewer"; // Assuming ThreeViewer component exists
import axios from "axios";
// Removed: import { format, parseISO } from 'date-fns';
// Removed: import { utcToZonedTime } from 'date-fns-tz';

// Define available satellites based on what the backend currently processes
const availableSatellites = [
  { name: "ace", description: "The Advanced Composition Explorer (ACE) observes particles of solar, interstellar, interplanetary, and galactic origins." },
  { name: "wind", description: "The WIND spacecraft studies the solar wind and its impact on Earth's magnetosphere." },
  { name: "goes17", description: "GOES 17 is a weather satellite operated by NOAA." }, // Added descriptions
  { name: "goes16", description: "GOES 16 is another weather satellite operated by NOAA." },
];

const HomePage = () => {
  // State variables for user input and fetched data
  const [observatories, setObservatories] = useState("ace,wind");
  // Use default times in YYYY-MM-DDTHH:MM format for datetime-local input
  // Note: These default dates/times might need adjustment depending on when you run this,
  // as historical data availability varies. Using a date well in the past is safer for examples.
  const [startTime, setStartTime] = useState("2024-01-01T00:00");
  const [endTime, setEndTime] = useState("2024-01-01T01:00");
  const [coordinateSystem, setCoordinateSystem] = useState("GSE");
  const [resolutionFactor] = useState("5"); // resolutionFactor is fixed as no UI input

  // State for fetched data - backend only returns vertices and labels
  const [data, setData] = useState({ vertices: [], labels: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // To display non-error messages from backend

  // State for the active tab in the satellite information section
  const [activeTab, setActiveTab] = useState(availableSatellites[0].name);

  // Helper function to format time string for the backend API (expects YYYYMMDDTHHMMSSZ)
  // Using native JavaScript Date methods
  const formatTimeForBackend = useCallback((timeString) => {
     if (!timeString) return null;
     try {
       // Create a Date object from the YYYY-MM-DDTHH:MM string.
       // new Date() will typically interpret this string in the local timezone.
       const date = new Date(timeString);

       // Check if the date is valid
       if (isNaN(date.getTime())) {
           throw new Error("Invalid date string");
       }

       // Extract UTC components using native Date methods
       // getUTCMonth() is 0-indexed, so add 1
       const year = date.getUTCFullYear();
       const month = String(date.getUTCMonth() + 1).padStart(2, "0");
       const day = String(date.getUTCDate()).padStart(2, "0");
       const hours = String(date.getUTCHours()).padStart(2, "0");
       const minutes = String(date.getUTCMinutes()).padStart(2, "0");
       const seconds = "00"; // Assuming seconds are always zero for the backend

       // Manually construct the YYYYMMDDTHHMMSSZ string
       const formatted = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;

       // Basic validation for the output format length
       if (formatted.length !== 16 || !formatted.endsWith('Z')) {
           console.error("Homemade formatting resulted in unexpected string:", formatted);
           setError(`Internal formatting error for time: ${timeString}`);
           return null;
       }

       return formatted;
     } catch (e) {
        console.error("Error formatting time:", timeString, e);
        setError(`Invalid time value entered.`);
        return null; // Return null or empty string to indicate failure
     }
  }, []); // No dependencies needed

  // Function to fetch satellite data from the backend
  const fetchSatelliteData = useCallback(async () => {
    // Clear previous error, message, and data
    setError("");
    setMessage("");
    setData({ vertices: [], labels: [] });

    // Validate required inputs
    if (!observatories || !startTime || !endTime || !coordinateSystem) {
      setError("Please fill in all required fields (Satellites, Start Time, End Time, Coordinate System).");
      return;
    }

    const formattedStartTime = formatTimeForBackend(startTime);
    const formattedEndTime = formatTimeForBackend(endTime);

    // Stop if time formatting failed (formatTimeForBackend sets the error message)
    if (!formattedStartTime || !formattedEndTime) {
        return;
    }

    // Optional: Validate start time is before end time using native Date objects
     try {
         const startDate = new Date(startTime);
         const endDate = new Date(endTime);
         if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
              setError("Invalid time range. Start time must be before end time.");
              return;
         }
     } catch(e) {
         console.warn("Could not validate time order with homemade method:", e);
         // Continue as backend will validate format, but order might be off
     }

    setIsLoading(true);

    try {
      // Make the GET request to the Flask backend API
      const response = await axios.get("/api/get-satellite-locations", {
        params: {
          observatories: observatories.toLowerCase(), // Ensure lowercase
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          coordinate_system: coordinateSystem.toUpperCase(), // Ensure uppercase
          resolution_factor: resolutionFactor, // Pass the fixed resolution factor
        },
        // Optional: Add timeout
        timeout: 15000, // 15 seconds timeout
      });

      console.log("Backend API Response:", response.data);

      // Check if the backend returned an error or a specific message (e.g., no data found)
      if (response.data.error) {
        setError(`Backend Error: ${response.data.error}`);
        // Clear any potentially partial data
        setData({ vertices: [], labels: [] });
      } else if (response.data.message) {
         // Handle specific messages like "No satellite data found"
         setMessage(response.data.message);
         setData({ vertices: [], labels: [] }); // Ensure data is empty
      }
      else {
        // Destructure only vertices and labels as returned by the backend on success
        const { vertices, labels } = response.data;
        setData({ vertices, labels });
         // Optionally display a success message if data was received
         if (vertices && vertices.length > 0) { // Added check for vertices existence
             setMessage(`Successfully loaded ${vertices.length} data points.`);
         } else {
              setMessage("Request successful, but no data points were returned.");
         }
      }
    } catch (error) {
      console.error("Error fetching satellite data:", error);
      // Handle different types of frontend/network errors
      if (axios.isAxiosError(error)) {
         if (error.code === 'ECONNABORTED') {
             setError("Request timed out. The backend or NASA SSC API took too long to respond.");
         } else if (error.response) {
             // The request was made and the server responded with a status code
             // that falls out of the range of 2xx
             setError(`API responded with status ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
         } else if (error.request) {
             // The request was made but no response was received
             setError("No response received from the API. Check if the backend is running and accessible.");
         } else {
             // Something happened in setting up the request that triggered an Error
             setError(`Error setting up API request: ${error.message}`);
         }
      } else {
         // Any other unexpected errors
         setError(`An unexpected frontend error occurred: ${error}`);
      }
      // Clear any potentially partial data
      setData({ vertices: [], labels: [] });
    } finally {
      setIsLoading(false);
    }
  }, [observatories, startTime, endTime, coordinateSystem, resolutionFactor, formatTimeForBackend]); // Added dependencies

  // Optional: Fetch data on initial component mount or when dependencies change
  // useEffect(() => {
  //    fetchSatelliteData();
  // }, [fetchSatelliteData]); // Fetch data when fetchSatelliteData changes (due to useCallback deps)


  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
     <header className="bg-blue-900 py-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-3xl md:text-4xl font-bold uppercase">NASA Satellite Data</h1>
          <p className="text-md md:text-lg">
            Powered by <a className="underline hover:text-blue-200  hover:animate-pulse" href="https://www.nasa.gov/goddard/" target="_blank" rel="noopener noreferrer">Goddard Space Flight Center</a>
          </p>
        </div>
        <img
          src="/Goddard_Nasa_logo.png" // Ensure this logo file exists in your public directory
          alt="NASA Logo"
          className="w-16 h-16 object-cover"
        />
      </div>
    </header>

      <main className="container mx-auto py-8 flex-grow px-4">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Satellite Data Visualization Tool Sampler</h2>
          <p className="text-gray-300 mb-6">
            Visualize satellite trajectories fetched from the NASA SSC Web Services.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="observatories" className="block text-gray-400 text-sm font-medium mb-1">Satellites (comma-separated):</label>
              <input
                id="observatories"
                type="text"
                value={observatories}
                onChange={(e) => setObservatories(e.target.value)}
                placeholder="e.g., ace,wind"
                className="p-2 bg-gray-900 text-white border border-gray-700 rounded w-full focus:outline-none focus:ring focus:ring-blue-500"
              />
              <div className="mt-2 text-gray-400 text-sm">
                <strong>Available:</strong> {availableSatellites.map(s => s.name).join(', ')}. Use lowercase.
              </div>
            </div>

            <div>
              <label htmlFor="coordinateSystem" className="block text-gray-400 text-sm font-medium mb-1">Coordinate System:</label>
              <input
                id="coordinateSystem"
                type="text"
                value={coordinateSystem}
                onChange={(e) => setCoordinateSystem(e.target.value)}
                placeholder="e.g., GSE, GEO, GSM"
                className="p-2 bg-gray-900 text-white border border-gray-700 rounded w-full focus:outline-none focus:ring focus:ring-blue-500"
              />
               <div className="mt-2 text-gray-400 text-sm">
                <strong>Common:</strong> GSE, GEO, GSM, SM, MAG, LGM, RTN, RTP, GSEQ. Use uppercase.
              </div>
            </div>

            <div>
               <label htmlFor="startTime" className="block text-gray-400 text-sm font-medium mb-1">Start Time (UTC):</label>
               {/* Using type="datetime-local" for easier input */}
               {/* Note: datetime-local inputs are based on the user's local timezone,
                   but we will parse and send as UTC to the backend */}
               <input
                 id="startTime"
                 type="datetime-local"
                 value={startTime}
                 onChange={(e) => setStartTime(e.target.value)}
                 className="p-2 bg-gray-900 text-white border border-gray-700 rounded w-full focus:outline-none focus:ring focus:ring-blue-500"
               />
            </div>

            <div>
               <label htmlFor="endTime" className="block text-gray-400 text-sm font-medium mb-1">End Time (UTC):</label>
                {/* Using type="datetime-local" for easier input */}
               <input
                 id="endTime"
                 type="datetime-local"
                 value={endTime}
                 onChange={(e) => setEndTime(e.target.value)}
                 className="p-2 bg-gray-900 text-white border border-gray-700 rounded w-full focus:outline-none focus:ring focus:ring-blue-500"
               />
            </div>
             {/* Resolution Factor input is removed */}
          </div>

          <button
            onClick={fetchSatelliteData}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            disabled={isLoading}
          >
            {isLoading ? "Fetching Data..." : "Fetch Satellite Data"}
          </button>
          {/* Display error or success/info message */}
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          {!error && message && <p className="text-green-500 mt-4 text-sm">{message}</p>}
        </div>

        {/* Tabs Section */}
        <div className="bg-gray-900 mt-8 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl md:text-2xl font-bold mb-4">Satellite Information</h3>
          <div className="flex flex-wrap gap-4 mb-4">
            {availableSatellites.map((satellite) => (
              <button
                key={satellite.name}
                className={`px-4 py-2 rounded-md transition duration-300 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  activeTab === satellite.name ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setActiveTab(satellite.name)}
              >
                {satellite.name.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="text-gray-300 text-sm">
            {availableSatellites
              .filter((satellite) => satellite.name === activeTab)
              .map((satellite) => (
                <p key={satellite.name}>
                  {satellite.description}
                </p>
              ))}
          </div>
        </div>

        {/* 3D Visualization Section */}
        {/* Only render the viewer if we have vertices to show */}
        {data.vertices && data.vertices.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-xl md:text-2xl font-bold mb-4">3D Visualization</h3>
            <div className="bg-gray-900 p-4 rounded-lg shadow-lg h-[60vh] md:h-[70vh]"> {/* Added height */}
              {/* Pass vertices and labels */}
              <ThreeViewer vertices={data.vertices} labels={data.labels} />
            </div>
          </div>
        ) : (
            // Display a message if no data is available for visualization
             !isLoading && !error && (
                <div className="mt-8 text-center text-gray-400">
                    {message || "No satellite data fetched yet. Use the form above to fetch data."}
                </div>
            )
        )}
      </main>

      <footer className="bg-gray-900 py-4 mt-auto">
        <div className="container mx-auto text-center px-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Earth, USA  - Developed by SurfDeck
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;