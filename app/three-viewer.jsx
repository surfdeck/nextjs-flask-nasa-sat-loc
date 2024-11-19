"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

const ThreeViewer = ({ vertices, labels }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || vertices.length === 0) {
      console.error("Mount reference is null or vertices are empty.");
      return;
    }

    // Clear any existing content
    mountRef.current.innerHTML = "";

    const scene = new THREE.Scene();
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scaling the vertices dynamically based on the maximum dimension
    const maxX = Math.max(...vertices.map((v) => Math.abs(v[0])));
    const maxY = Math.max(...vertices.map((v) => Math.abs(v[1])));
    const maxZ = Math.max(...vertices.map((v) => Math.abs(v[2])));
    const maxDimension = Math.max(maxX, maxY, maxZ);

    const scalingFactor = 150 / maxDimension;
    const scaledVertices = vertices.map((vertex) =>
      vertex.map((coord) => coord * scalingFactor)
    );

    // Camera setup
    const boundingBox = new THREE.Box3().setFromPoints(
      scaledVertices.map((v) => new THREE.Vector3(...v))
    );
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDim * 2;
    camera.position.set(center.x, center.y, center.z + cameraDistance);
    camera.lookAt(center);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // Earth as Blue Sphere
    const earthGeometry = new THREE.SphereGeometry(50, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Cloud Layer
    const cloudGeometry = new THREE.SphereGeometry(51, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);

    // Add Maryland Marker
    const marylandMarkerGeometry = new THREE.SphereGeometry(1, 16, 16);
    const marylandMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marylandMarker = new THREE.Mesh(marylandMarkerGeometry, marylandMarkerMaterial);

    const marylandLatitude = 39.0458; // Degrees
    const marylandLongitude = -76.6413; // Degrees
    const earthRadius = 50; // Earth's radius in the scene

    const phi = (90 - marylandLatitude) * (Math.PI / 180);
    const theta = (marylandLongitude + 180) * (Math.PI / 180);

    marylandMarker.position.set(
      earthRadius * Math.sin(phi) * Math.cos(theta),
      earthRadius * Math.cos(phi),
      earthRadius * Math.sin(phi) * Math.sin(theta)
    );
    scene.add(marylandMarker);
    

    // Add Text for Maryland
    const fontLoader = new FontLoader();
    fontLoader.load(
      "/fonts/helvetiker_regular.typeface.json",
      (font) => {
        const textGeometry = new TextGeometry("Goddard Space Flight Center", {
          font,
          size: 5,
          height: 1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        textMesh.position.set(
          marylandMarker.position.x,
          marylandMarker.position.y + 5, // Slightly above the marker
          marylandMarker.position.z
        );

        const outwardVector = new THREE.Vector3(
          textMesh.position.x,
          textMesh.position.y,
          textMesh.position.z
        ).normalize();
        textMesh.lookAt(outwardVector.multiplyScalar(100));

        scene.add(textMesh);
      },
      undefined,
      (error) => {
        console.error("Error loading font:", error);
      }
    );

    // Moon with Glow Effect
    const moonGeometry = new THREE.SphereGeometry(10, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);

    const moonGlowGeometry = new THREE.SphereGeometry(12, 32, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,

    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moon.add(moonGlow);

    let moonAngle = 0;

    // Create Satellite Points and Text Labels
    const satelliteGroup = new THREE.Group();
    scaledVertices.forEach((vertex, index) => {
      const satelliteGeometry = new THREE.SphereGeometry(1, 16, 16);
      const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      satellite.position.set(vertex[0], vertex[1], vertex[2]);
      satelliteGroup.add(satellite);

      fontLoader.load(
        "/fonts/helvetiker_regular.typeface.json",
        (font) => {
          const label = labels[index] || `Satellite ${index + 1}`;
          const textGeometry = new TextGeometry(label, {
            font,
            size: 2.5,
            height: 0.5,
          });
          const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const textMesh = new THREE.Mesh(textGeometry, textMaterial);
          textMesh.position.set(
            vertex[0],
            vertex[1] + 5,
            vertex[2]
          );
          satelliteGroup.add(textMesh);
        },
        undefined,
        (error) => {
          console.error("Error loading font:", error);
        }
      );
    });
    scene.add(satelliteGroup);

    // Starfield Background
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 2000;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Resize Handler
    const handleResize = () => {
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);

      earth.rotation.y += 0.001;
      clouds.rotation.y += 0.001;
      satelliteGroup.rotation.y += 0.001;

      moonAngle += 0.005;
      const moonOrbitRadius = 100;
      moon.position.set(
        Math.cos(moonAngle) * moonOrbitRadius,
        0,
        Math.sin(moonAngle) * moonOrbitRadius
      );

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [vertices, labels]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "600px",
        backgroundColor: "#000",
      }}
    />
  );
};

export default ThreeViewer;
