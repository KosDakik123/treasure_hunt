"use strict";

/*
  Treasure Hunty Zagreb
  Core systems:
  - Google Maps setup and map markers
  - Real-time GPS tracking via Geolocation watchPosition
  - Compass logic with device orientation + fallback bearing
  - Treasure detection radius and collection flow
  - localStorage persistence for score and collected treasures
*/

const COLLECTION_RADIUS_METERS = 35;
const STORAGE_KEY = "treasureHuntyProgressV1";
const ROUTE_REFRESH_MS = 20000;

const TREASURES = [
  {
    id: "ban-jelacic",
    name: "Ban Jelacic Square",
    coords: { lat: 45.8131, lng: 15.9775 },
    description: "The energetic heart of Zagreb with trams, events, and city life.",
    funFacts: [
      "The square is named after Ban Josip Jelacic, a Croatian national hero.",
      "Ban Jelacic statue originally faced north, then was rotated in the 1990s.",
      "It has been a central city meeting point for over a century."
    ],
    points: 120
  },
  {
    id: "cathedral",
    name: "Zagreb Cathedral",
    coords: { lat: 45.8145, lng: 15.9799 },
    description: "A neo-gothic landmark with iconic twin towers over the old city.",
    funFacts: [
      "Its history goes back to the 11th century and it survived major earthquakes.",
      "The towers are one of the most recognizable symbols of Zagreb.",
      "Large restorations followed the 1880 earthquake."
    ],
    points: 140
  },
  {
    id: "maksimir",
    name: "Maksimir Park",
    coords: { lat: 45.8246, lng: 16.0186 },
    description: "A huge green oasis with lakes, trails, and classic park architecture.",
    funFacts: [
      "Maksimir is one of the oldest public parks in Southeast Europe.",
      "Its design mixes English-style park ideas with local landscapes.",
      "The park area is over 300 hectares."
    ],
    points: 180
  },
  {
    id: "zrinjevac",
    name: "Zrinjevac",
    coords: { lat: 45.8099, lng: 15.9818 },
    description: "A beautiful park square famous for its music pavilion and trees.",
    funFacts: [
      "It is part of the Lenuci Horseshoe urban project.",
      "Open-air concerts are often held at the central pavilion.",
      "Zrinjevac is known for old plane trees and seasonal festivals."
    ],
    points: 110
  },
  {
    id: "gornji-grad",
    name: "Upper Town / Gornji Grad",
    coords: { lat: 45.8162, lng: 15.9734 },
    description: "Historic hill district with cobblestone streets and panoramic viewpoints.",
    funFacts: [
      "The Lotrscak Tower still fires a cannon every day at noon.",
      "Stone Gate is the only preserved old city gate.",
      "The area includes St. Mark's Church with its famous tiled roof."
    ],
    points: 160
  },
  {
    id: "dolac",
    name: "Dolac Market",
    coords: { lat: 45.8142, lng: 15.9782 },
    description: "The citys iconic farmers market, known for red umbrellas.",
    funFacts: [
      "Locals call it the belly of Zagreb.",
      "Fresh produce, flowers, and cheese are sold daily here.",
      "The market opened in 1930."
    ],
    points: 125
  },
  {
    id: "stone-gate",
    name: "Stone Gate",
    coords: { lat: 45.8168, lng: 15.9748 },
    description: "A historic gate and chapel connecting old streets.",
    funFacts: [
      "Stone Gate contains a shrine to the Virgin Mary.",
      "It survived city fires that destroyed many nearby structures.",
      "Many residents pass through to light candles."
    ],
    points: 150
  },
  {
    id: "strossmayer",
    name: "Strossmayer Promenade",
    coords: { lat: 45.8148, lng: 15.9735 },
    description: "A scenic walkway with sweeping views over Zagreb.",
    funFacts: [
      "In summer it hosts small cultural events and performances.",
      "It is a favorite sunset viewpoint in the city center.",
      "Street art and murals often appear nearby."
    ],
    points: 130
  },
  {
    id: "jarun",
    name: "Jarun Lake",
    coords: { lat: 45.7839, lng: 15.9264 },
    description: "A sports and recreation zone with lakes and paths.",
    funFacts: [
      "Jarun is often called the Zagreb sea.",
      "The area was developed for the 1987 Universiade games.",
      "It is popular for cycling, rowing, and running."
    ],
    points: 200
  }
];

const state = {
  map: null,
  userMarker: null,
  treasureMarkers: new Map(),
  directionsService: null,
  directionsRenderer: null,
  watchId: null,
  selectedTreasureId: null,
  userPosition: null,
  mapReady: false,
  score: 0,
  collected: [],
  lastDistanceMeters: null,
  headingDegrees: null,
  orientationMode: "fallback",
  selectedCardElement: null,
  lastRouteRequestAt: 0
};

const ui = {};

function cacheElements() {
  ui.screens = {
    home: document.getElementById("homeScreen"),
    select: document.getElementById("selectScreen"),
    hunt: document.getElementById("huntScreen")
  };
  ui.startBtn = document.getElementById("startBtn");
  ui.goHuntBtn = document.getElementById("goHuntBtn");
  ui.treasureList = document.getElementById("treasureList");
  ui.collectBtn = document.getElementById("collectBtn");
  ui.fullscreenBtn = document.getElementById("fullscreenBtn");
  ui.gpsStatus = document.getElementById("gpsStatus");
  ui.proximityStatus = document.getElementById("proximityStatus");
  ui.distanceBadge = document.getElementById("distanceBadge");
  ui.selectedTreasureName = document.getElementById("selectedTreasureName");
  ui.selectedTreasureDesc = document.getElementById("selectedTreasureDesc");
  ui.funFact = document.getElementById("funFact");
  ui.latValue = document.getElementById("latValue");
  ui.lngValue = document.getElementById("lngValue");
  ui.accValue = document.getElementById("accValue");
  ui.bearingValue = document.getElementById("bearingValue");
  ui.walkEta = document.getElementById("walkEta");
  ui.transitEta = document.getElementById("transitEta");
  ui.nextHint = document.getElementById("nextHint");
  ui.mapHint = document.getElementById("mapHint");
  ui.scoreValue = document.getElementById("scoreValue");
  ui.collectedValue = document.getElementById("collectedValue");
  ui.progressValue = document.getElementById("progressValue");
  ui.compassNeedle = document.getElementById("compassNeedle");
  ui.compassMode = document.getElementById("compassMode");
  ui.successModal = document.getElementById("successModal");
  ui.successText = document.getElementById("successText");
  ui.closeModalBtn = document.getElementById("closeModalBtn");
}

function bindEvents() {
  ui.startBtn.addEventListener("click", () => {
    setScreen("select");
  });

  ui.goHuntBtn.addEventListener("click", () => {
    if (!state.selectedTreasureId) return;
    setScreen("hunt");
    updateSelectedTreasureUI();
    startGeoWatch();
  });

  ui.collectBtn.addEventListener("click", collectTreasure);

  ui.closeModalBtn.addEventListener("click", () => {
    ui.successModal.classList.add("hidden");
  });

  ui.fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.userPosition) {
      updateRouteHints(true);
      updateCompass();
    }
  });
}

function setScreen(target) {
  Object.values(ui.screens).forEach((screen) => screen.classList.remove("active"));
  ui.screens[target].classList.add("active");
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.score = Number(parsed.score) || 0;
    state.collected = Array.isArray(parsed.collected) ? parsed.collected : [];
  } catch (_err) {
    console.warn("Could not parse progress from localStorage.");
  }
}

function saveProgress() {
  // Save score and collected treasure IDs so the game progress survives refresh/device restarts.
  const payload = {
    score: state.score,
    collected: state.collected
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function renderTreasureSelection() {
  ui.treasureList.innerHTML = "";
  state.selectedCardElement = null;

  TREASURES.forEach((treasure) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "treasure-option";
    if (state.collected.includes(treasure.id)) {
      card.disabled = true;
      card.style.opacity = "0.55";
    }
    card.innerHTML = `
      <strong>${treasure.name}</strong>
      <p class="muted">${treasure.description}</p>
      <p class="muted">Fun facts: ${treasure.funFacts.length}</p>
      <p class="muted">Reward: ${treasure.points} points</p>
    `;
    card.addEventListener("click", () => {
      state.selectedCardElement = card;
      selectTreasure(treasure.id);
    });
    ui.treasureList.appendChild(card);
  });
}

function selectTreasure(treasureId) {
  state.selectedTreasureId = treasureId;
  [...ui.treasureList.children].forEach((node) => node.classList.remove("active"));
  state.selectedCardElement?.classList.add("active");
  ui.goHuntBtn.disabled = false;
}

function getTreasureById(id) {
  return TREASURES.find((t) => t.id === id);
}

function updateSelectedTreasureUI() {
  const treasure = getTreasureById(state.selectedTreasureId);
  if (!treasure) return;
  ui.selectedTreasureName.textContent = treasure.name;
  ui.selectedTreasureDesc.textContent = treasure.description;
  ui.funFact.textContent = `Fun facts: ${treasure.funFacts.join(" | ")}`;
}

function updateScoreUI() {
  ui.scoreValue.textContent = `${state.score}`;
  ui.collectedValue.textContent = `${state.collected.length}/${TREASURES.length}`;
  const pct = Math.round((state.collected.length / TREASURES.length) * 100);
  ui.progressValue.textContent = `${pct}%`;
}

function setGpsStatus(text, type = "warning") {
  ui.gpsStatus.textContent = text;
  ui.gpsStatus.className = `status-pill ${type}`;
}

function initMap() {
  if (!window.google || !window.google.maps) {
    ui.mapHint.textContent = "Google Maps failed to load. Check API key and billing.";
    return;
  }

  state.map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 45.815, lng: 15.9819 },
    zoom: 13,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8ec3ff" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#101a32" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#2f4f7d" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#273f65" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#10243d" }] }
    ],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  // Route rendering uses real roads/paths from Google Directions, not a straight line.
  state.directionsService = new google.maps.DirectionsService();
  state.directionsRenderer = new google.maps.DirectionsRenderer({
    map: state.map,
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: "#7fffd4",
      strokeOpacity: 0.9,
      strokeWeight: 5
    }
  });

  TREASURES.forEach((treasure) => {
    const marker = new google.maps.Marker({
      position: treasure.coords,
      map: state.map,
      title: treasure.name,
      icon: {
        path: "M 0 -16 L 14 -2 L 7 14 L -7 14 L -14 -2 Z",
        fillColor: "#f4cd41",
        fillOpacity: 1,
        strokeColor: "#5a4500",
        strokeWeight: 2,
        scale: 1
      }
    });
    state.treasureMarkers.set(treasure.id, marker);
  });

  state.mapReady = true;
}

function startGeoWatch() {
  if (!("geolocation" in navigator)) {
    setGpsStatus("Geolocation unsupported on this browser.", "danger");
    ui.mapHint.textContent = "Your browser cannot provide GPS position.";
    return;
  }

  setGpsStatus("Waiting for GPS permission...", "warning");

  // watchPosition keeps tracking in real time while the user physically moves.
  state.watchId = navigator.geolocation.watchPosition(
    (position) => {
      handlePosition(position);
    },
    (error) => {
      handleGeoError(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000
    }
  );
}

function handlePosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  state.userPosition = { lat: latitude, lng: longitude };

  ui.latValue.textContent = latitude.toFixed(6);
  ui.lngValue.textContent = longitude.toFixed(6);
  ui.accValue.textContent = `${Math.round(accuracy)} m`;
  setGpsStatus("Live GPS tracking active", "success");
  ui.mapHint.textContent = "Your live position is updating on the map.";

  if (state.mapReady) {
    upsertUserMarker();
    if (!state.userMarker._hasCenteredOnce) {
      state.map.setCenter(state.userPosition);
      state.map.setZoom(16);
      state.userMarker._hasCenteredOnce = true;
    }
  }

  updateDistanceAndDetection();
  updateRouteHints();
  updateCompass();
}

function upsertUserMarker() {
  if (!state.userMarker) {
    state.userMarker = new google.maps.Marker({
      position: state.userPosition,
      map: state.map,
      title: "You",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#44f2b2",
        fillOpacity: 1,
        strokeColor: "#083729",
        strokeWeight: 4,
        scale: 8
      }
    });
    return;
  }
  state.userMarker.setPosition(state.userPosition);
}

function updateRouteHints(force = false) {
  const target = getTreasureById(state.selectedTreasureId);
  if (!state.mapReady || !state.userPosition || !target) return;
  if (!force && Date.now() - state.lastRouteRequestAt < ROUTE_REFRESH_MS) return;
  state.lastRouteRequestAt = Date.now();
  requestRoute(target.coords, "WALKING");
  requestRoute(target.coords, "TRANSIT");
}

function requestRoute(destination, mode) {
  state.directionsService.route(
    {
      origin: state.userPosition,
      destination,
      travelMode: google.maps.TravelMode[mode]
    },
    (result, status) => {
      if (status !== "OK" || !result?.routes?.length) {
        if (mode === "WALKING") {
          ui.walkEta.textContent = "Route unavailable";
          ui.nextHint.textContent = "No walking route right now.";
        } else {
          ui.transitEta.textContent = "Transit unavailable";
        }
        return;
      }
      const leg = result.routes[0].legs[0];
      if (mode === "WALKING") {
        state.directionsRenderer.setDirections(result);
        ui.walkEta.textContent = `${leg.duration?.text ?? "--"} (${leg.distance?.text ?? "--"})`;
        const nextStep = leg.steps?.[0]?.instructions ?? "Follow the highlighted route.";
        ui.nextHint.textContent = stripHtml(nextStep);
      } else {
        ui.transitEta.textContent = `${leg.duration?.text ?? "--"} (${leg.distance?.text ?? "--"})`;
      }
    }
  );
}

function updateDistanceAndDetection() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target || !state.userPosition) return;

  const distanceMeters = haversineDistanceMeters(state.userPosition, target.coords);
  state.lastDistanceMeters = distanceMeters;
  ui.distanceBadge.textContent = formatDistance(distanceMeters);

  const bearing = calculateBearing(state.userPosition, target.coords);
  ui.bearingValue.textContent = `${Math.round(bearing)}°`;

  // Treasure unlock logic: when inside configurable radius, collection is enabled.
  if (distanceMeters <= COLLECTION_RADIUS_METERS) {
    ui.collectBtn.disabled = false;
    ui.proximityStatus.textContent = "Within treasure radius";
    ui.proximityStatus.className = "status-pill success";
  } else {
    ui.collectBtn.disabled = false;
    ui.proximityStatus.textContent = `Move closer (need <= ${COLLECTION_RADIUS_METERS} m)`;
    ui.proximityStatus.className = "status-pill";
    if (!state.collected.includes(target.id)) {
      ui.collectBtn.disabled = true;
    }
  }
}

function stripHtml(value) {
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

function collectTreasure() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target || state.collected.includes(target.id)) return;
  if (state.lastDistanceMeters === null || state.lastDistanceMeters > COLLECTION_RADIUS_METERS) return;

  state.collected.push(target.id);
  state.score += target.points;
  saveProgress();
  updateScoreUI();
  renderTreasureSelection();

  const marker = state.treasureMarkers.get(target.id);
  if (marker) {
    marker.setIcon({
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      fillColor: "#35dc8c",
      fillOpacity: 1,
      strokeColor: "#0f3824",
      strokeWeight: 2,
      scale: 5
    });
  }

  ui.successText.textContent = `You collected ${target.name} and earned +${target.points} points!`;
  ui.successModal.classList.remove("hidden");
  ui.collectBtn.disabled = true;
  ui.proximityStatus.textContent = "Treasure collected";
  ui.proximityStatus.className = "status-pill success";

  playSuccessTone();
  if (navigator.vibrate) {
    navigator.vibrate([180, 100, 180]);
  }
}

function playSuccessTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 660;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.frequency.value = 920;
    }, 120);
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 260);
  } catch (_err) {
    // Ignore if browser blocks audio context before user gesture.
  }
}

function handleGeoError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      setGpsStatus("Location permission denied.", "danger");
      ui.mapHint.textContent = "Allow location access in browser settings to continue.";
      break;
    case error.POSITION_UNAVAILABLE:
      setGpsStatus("Location unavailable right now.", "danger");
      ui.mapHint.textContent = "Try moving to an open area and retry GPS.";
      break;
    case error.TIMEOUT:
      setGpsStatus("GPS timeout. Retrying...", "warning");
      ui.mapHint.textContent = "Signal is weak; waiting for better GPS lock.";
      break;
    default:
      setGpsStatus("Unknown GPS error occurred.", "danger");
      ui.mapHint.textContent = "Please reload the page and allow permissions.";
      break;
  }
}

function setupCompass() {
  const iOSNeedsPermission = typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";

  if (iOSNeedsPermission) {
    const unlock = () => {
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", onDeviceOrientation, true);
            state.orientationMode = "device orientation";
            ui.compassMode.textContent = "Compass mode: device orientation";
          }
        })
        .catch(() => {
          state.orientationMode = "fallback bearing";
        });
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
  } else if ("DeviceOrientationEvent" in window) {
    window.addEventListener("deviceorientationabsolute", onDeviceOrientation, true);
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
    state.orientationMode = "device orientation";
    ui.compassMode.textContent = "Compass mode: device orientation";
  } else {
    state.orientationMode = "fallback bearing";
    ui.compassMode.textContent = "Compass mode: fallback bearing";
  }
}

function onDeviceOrientation(event) {
  const alpha = event.webkitCompassHeading ?? event.alpha;
  if (typeof alpha !== "number") return;
  state.headingDegrees = normalizeDegrees(alpha);
  updateCompass();
}

function updateCompass() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target || !state.userPosition) return;

  const targetBearing = calculateBearing(state.userPosition, target.coords);
  let needleRotation;

  // If we know device heading, rotate relative to where the user is facing.
  // Otherwise, fallback rotates directly to the map bearing.
  if (typeof state.headingDegrees === "number") {
    needleRotation = normalizeDegrees(targetBearing - state.headingDegrees);
  } else {
    needleRotation = targetBearing;
  }

  ui.compassNeedle.style.transform = `translate(-50%, -100%) rotate(${needleRotation}deg)`;
}

function haversineDistanceMeters(from, to) {
  const R = 6371000;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(from, to) {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function normalizeDegrees(deg) {
  return (deg + 360) % 360;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  }
}

function primeCollectedMarkers() {
  state.collected.forEach((id) => {
    const marker = state.treasureMarkers.get(id);
    if (marker) {
      marker.setIcon({
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        fillColor: "#35dc8c",
        fillOpacity: 1,
        strokeColor: "#0f3824",
        strokeWeight: 2,
        scale: 5
      });
    }
  });
}

window.initTreasureApp = function initTreasureApp() {
  cacheElements();
  loadProgress();
  bindEvents();
  updateScoreUI();
  renderTreasureSelection();
  setupCompass();
  initMap();
  primeCollectedMarkers();
  registerServiceWorker();
};
