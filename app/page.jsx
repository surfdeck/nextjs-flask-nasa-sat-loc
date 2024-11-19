"use client";

import { useState, useEffect } from "react";
import ThreeViewer from "./three-viewer";
import axios from "axios";

  const availableSatellites = [
    { name: "ace", description: "The Advanced Composition Explorer (ACE) observes particles of solar, interstellar, interplanetary, and galactic origins." },
    { name: "wind", description: "The WIND spacecraft studies the solar wind and its impact on Earth's magnetosphere." },
    { name: "More Satellites", description: "coming soon: GOES-17 and GOES-16. You can try but it's buggy." },

  ];

  const HomePage = () => {
    const [observatories, setObservatories] = useState("ace,wind");
    const [startTime, setStartTime] = useState("2024-01-01T06:00");
    const [endTime, setEndTime] = useState("2024-01-01T07:00");
    const [coordinateSystem, setCoordinateSystem] = useState("GSE");
    const [resolutionFactor, setResolutionFactor] = useState("1");
    const [data, setData] = useState({ vertices: [], faces: [], labels: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState(availableSatellites[0].name); // Active tab state

    const formatTime = (time) => {
      const date = new Date(time);
      const YYYY = date.getUTCFullYear();
      const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
      const DD = String(date.getUTCDate()).padStart(2, "0");
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const mm = String(date.getUTCMinutes()).padStart(2, "0");
      const ss = "00"; // Assuming seconds are zero
      return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`;
    };

  const fetchSatelliteData = async () => {
    if (!observatories || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return;
    }

    const formattedStartTime = formatTime(startTime);
    const formattedEndTime = formatTime(endTime);

    setIsLoading(true);
    setError("");
    setData({ vertices: [], faces: [], labels: [] });

    try {
      const response = await axios.get("http://localhost:5328/api/get-satellite-locations", {
        params: {
          observatories,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          coordinate_system: coordinateSystem,
          resolution_factor: resolutionFactor,
        },
      });

      console.log("API Response:", response.data);

      const { vertices, faces, labels } = response.data;

      if (response.data.error) {
        setError(response.data.error);
      } else {
        setData({ vertices, faces, labels });
      }
    } catch (error) {
      console.error("Error fetching satellite data:", error);
      setError("Failed to fetch satellite data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen">
     <header className="bg-blue-900 py-6">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold uppercase">NASA Satellite Data</h1>
          <p className="text-lg">
            Powered by <a className="underline hover:text-blue-200  hover:animate-pulse" href="https://www.nasa.gov/goddard/">Goddard Space Flight Center</a>
          </p>
        </div>
        <img
          src="/Goddard_Nasa_logo.png"
          alt="NASA Logo"
          className="w-16 h-16 object-cover"
        />
      </div>
    </header>

      <main className="container mx-auto py-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold mb-4">Satellite Data Visualization Tool Sampler</h2>
          <p className="text-gray-300 mb-4">
            Visualize real-time and historical satellite trajectories in a dynamic 3D environment.
          </p>
          <div className="mb-4">
            <label className="block text-gray-400">Observatories:</label>
            <input
              type="text"
              value={observatories}
              onChange={(e) => setObservatories(e.target.value)}
              placeholder="e.g., ace,wind"
              className="p-2 bg-gray-900 text-white border-gray-700 rounded w-full md:w-1/2"
            />
            <div className="mt-2">
              <strong className="text-gray-300">Available Satellites:</strong>
              <ul className="text-gray-400 list-disc list-inside">
                {availableSatellites.map((satellite, index) => (
                  <li key={index}>{satellite.name}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-400">Coordinate System:</label>
            <input
              type="text"
              value={coordinateSystem}
              onChange={(e) => setCoordinateSystem(e.target.value)}
              placeholder="e.g., GSE, GEO"
              className="p-2 bg-gray-900 text-white border-gray-700 rounded w-full md:w-1/2"
            />
          </div>

          {/* coming soon
          <div className="mb-4">
            <label className="block text-gray-400">Resolution Factor:</label>
            <input
              type="number"
              value={resolutionFactor}
              onChange={(e) => setResolutionFactor(e.target.value)}
              min="1"
              className="p-2 bg-gray-900 text-white border-gray-700 rounded w-full md:w-1/4"
            />
          </div> */}

          <button
            onClick={fetchSatelliteData}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
            disabled={isLoading}
          >
            {isLoading ? "Fetching..." : "Fetch Satellite Data"}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Tabs Section */}
        <div className="bg-gray-900 mt-8 p-6 rounded-lg">
          <h3 className="text-2xl font-bold mb-4">Satellite Information</h3>
          <div className="flex space-x-4">
            {availableSatellites.map((satellite) => (
              <button
                key={satellite.name}
                className={`px-4 py-2 rounded ${
                  activeTab === satellite.name ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-300"
                }`}
                onClick={() => setActiveTab(satellite.name)}
              >
                {satellite.name.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {availableSatellites
              .filter((satellite) => satellite.name === activeTab)
              .map((satellite) => (
                <p key={satellite.name} className="text-gray-300">
                  {satellite.description}
                </p>
              ))}
          </div>
        </div>

        {data.vertices.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-4">3D Visualization</h3>
            <div className="bg-gray-900 p-4 rounded-lg shadow-lg">
              <ThreeViewer vertices={data.vertices} faces={data.faces} labels={data.labels} />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 py-4">
        <div className="container mx-auto text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Earth, USA  - Developed by SurfDeck 
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
