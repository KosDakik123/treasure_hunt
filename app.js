"use strict";

/**
 * @fileoverview Treasure Hunty Zagreb — client-side GPS treasure hunt.
 *
 * What this file does (high level):
 * - Boots the map, tracks the player with watchPosition, and renders routes.
 * - Gates collection behind photos + a tiny “match the facts” quiz (checkpoint).
 * - Persists score and UI state in localStorage (same device / browser profile).
 *
 * Note for classmates: keep functions small and name them after what they *do*.
 * If you refactor, run through the hunt once on a real phone before demo day.
 */

const COLLECTION_RADIUS_METERS = 35;
/** How many “memory” photos players must take on the way (inclusive range). */
const MIN_MEMORY_PHOTOS = 1;
const MAX_MEMORY_PHOTOS = 3;
const STORAGE_KEY = "treasureHuntyProgressV1";
const VIEW_STATE_KEY = "treasureHuntyViewStateV1";
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
    transportTips: "Tram 6 or 11 to Ban Jelacic Square stop. Most city center tram lines reach this area quickly.",
    miniGamePairs: [
      { id: "a", clue: "The equestrian statue honors", match: "Ban Josip Jelacic" },
      { id: "b", clue: "This square is the city’s main hub for", match: "trams, events, and meetings" }
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
    transportTips: "Tram 6 or 11 to Kaptol, then short walk uphill to the Cathedral.",
    miniGamePairs: [
      { id: "a", clue: "The cathedral’s style is often called", match: "neo-gothic" },
      { id: "b", clue: "A major 19th-century earthquake that hit Zagreb", match: "1880" }
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
    transportTips: "Tram 4, 7, 11, or 12 to Maksimir stop. Walk 5-10 minutes to the park entrances.",
    miniGamePairs: [
      { id: "a", clue: "Maksimir is especially known as a historic", match: "public park" },
      { id: "b", clue: "The park landscape blends local nature with", match: "English-style ideas" }
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
    transportTips: "Tram 2, 4, 6, 9, 11, or 13 to Zrinjevac area (main station side), then walk into the square.",
    miniGamePairs: [
      { id: "a", clue: "Zrinjevac is part of Zagreb’s famous", match: "Lenuci Horseshoe" },
      { id: "b", clue: "A classic feature in the middle of the square", match: "music pavilion" }
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
    transportTips: "Take tram to Ban Jelacic Square, then walk uphill through Radiceva street to Upper Town.",
    miniGamePairs: [
      { id: "a", clue: "Lotrscak Tower is famous for the daily", match: "noon cannon" },
      { id: "b", clue: "St. Mark's Church is known for its colorful", match: "tiled roof" }
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
    transportTips: "Any tram to Ban Jelacic Square then 2 minutes on foot to Dolac stairs.",
    miniGamePairs: [
      { id: "a", clue: "Dolac is nicknamed the city’s", match: "belly" },
      { id: "b", clue: "Shoppers often notice rows of bright", match: "red umbrellas" }
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
    transportTips: "Tram to Ban Jelacic Square and walk through Tkalciceva toward Kamenita vrata.",
    miniGamePairs: [
      { id: "a", clue: "Inside Stone Gate you’ll find a shrine to", match: "the Virgin Mary" },
      { id: "b", clue: "Locals often stop to light", match: "candles" }
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
    transportTips: "Tram to Ilica or Ban Jelacic Square, then walk up to Strossmayer promenade.",
    miniGamePairs: [
      { id: "a", clue: "Strossmayer is a classic", match: "promenade with views" },
      { id: "b", clue: "Summer evenings may bring small", match: "outdoor performances" }
    ],
    points: 130
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
  lastRouteRequestAt: 0,
  activeScreen: "home",
  /** In-memory photo previews for the current leg (revoked on reset). */
  memoryPhotos: [],
  /** Player must finish the match game before collecting. */
  checkpointQuizPassed: false,
  /** Quiz UI: which clue card is waiting for a match. */
  quizActiveClueId: null
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
  ui.backToHomeBtn = document.getElementById("backToHomeBtn");
  ui.backToSelectBtn = document.getElementById("backToSelectBtn");
  ui.nextHuntBtn = document.getElementById("nextHuntBtn");
  ui.exitHuntBtn = document.getElementById("exitHuntBtn");
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
  ui.transportTips = document.getElementById("transportTips");
  ui.mapHint = document.getElementById("mapHint");
  ui.scoreValue = document.getElementById("scoreValue");
  ui.collectedValue = document.getElementById("collectedValue");
  ui.progressValue = document.getElementById("progressValue");
  ui.remainingValue = document.getElementById("remainingValue");
  ui.compassNeedle = document.getElementById("compassNeedle");
  ui.compassMode = document.getElementById("compassMode");
  ui.successModal = document.getElementById("successModal");
  ui.successText = document.getElementById("successText");
  ui.closeModalBtn = document.getElementById("closeModalBtn");
  ui.memoryPhotoInput = document.getElementById("memoryPhotoInput");
  ui.memoryPhotoStrip = document.getElementById("memoryPhotoStrip");
  ui.memoryPhotoStatus = document.getElementById("memoryPhotoStatus");
  ui.openQuizBtn = document.getElementById("openQuizBtn");
  ui.quizModal = document.getElementById("quizModal");
  ui.quizModalSubtitle = document.getElementById("quizModalSubtitle");
  ui.quizClues = document.getElementById("quizClues");
  ui.quizMatches = document.getElementById("quizMatches");
  ui.quizFeedback = document.getElementById("quizFeedback");
  ui.closeQuizBtn = document.getElementById("closeQuizBtn");
}

function bindEvents() {
  ui.startBtn.addEventListener("click", () => {
    setScreen("select");
  });
  ui.backToHomeBtn.addEventListener("click", () => {
    setScreen("home");
  });
  ui.backToSelectBtn.addEventListener("click", () => {
    stopGeoWatch();
    setScreen("select");
  });

  ui.goHuntBtn.addEventListener("click", () => {
    if (!state.selectedTreasureId) return;
    resetCheckpointState();
    setScreen("hunt");
    updateSelectedTreasureUI();
    startGeoWatch();
  });

  ui.collectBtn.addEventListener("click", collectTreasure);
  ui.nextHuntBtn.addEventListener("click", startNextHunt);
  ui.exitHuntBtn.addEventListener("click", () => {
    stopGeoWatch();
    setScreen("select");
  });

  ui.memoryPhotoInput.addEventListener("change", onMemoryPhotosPicked);
  ui.openQuizBtn.addEventListener("click", openCheckpointQuiz);
  ui.closeQuizBtn.addEventListener("click", () => {
    ui.quizModal.classList.add("hidden");
  });

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
  state.activeScreen = target;
  saveViewState();
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

function loadViewState() {
  const raw = localStorage.getItem(VIEW_STATE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.selectedTreasureId) {
      state.selectedTreasureId = parsed.selectedTreasureId;
    }
    if (parsed.activeScreen) {
      state.activeScreen = parsed.activeScreen;
    }
  } catch (_err) {
    console.warn("Could not parse view state from localStorage.");
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

function saveViewState() {
  localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
    selectedTreasureId: state.selectedTreasureId,
    activeScreen: state.activeScreen
  }));
}

/**
 * Clears photo previews and quiz progress when the player switches targets.
 * We revoke object URLs so the browser can free memory (good habit on mobile).
 */
function resetCheckpointState() {
  state.memoryPhotos.forEach((entry) => URL.revokeObjectURL(entry.url));
  state.memoryPhotos = [];
  state.checkpointQuizPassed = false;
  state.quizActiveClueId = null;
  if (ui.memoryPhotoInput) ui.memoryPhotoInput.value = "";
  if (ui.memoryPhotoStrip) ui.memoryPhotoStrip.innerHTML = "";
  updateMemoryStatus();
  updateCollectAvailability();
  if (ui.openQuizBtn) ui.openQuizBtn.disabled = true;
}

function onMemoryPhotosPicked(event) {
  const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;

  // Add up to MAX_MEMORY_PHOTOS total; extra picks are ignored (keeps the UX forgiving).
  for (const file of files) {
    if (state.memoryPhotos.length >= MAX_MEMORY_PHOTOS) break;
    state.memoryPhotos.push({
      url: URL.createObjectURL(file),
      name: file.name
    });
  }

  renderMemoryStrip();
  updateMemoryStatus();
  updateCollectAvailability();
  event.target.value = "";
}

function renderMemoryStrip() {
  ui.memoryPhotoStrip.innerHTML = "";
  state.memoryPhotos.forEach((entry, index) => {
    const img = document.createElement("img");
    img.src = entry.url;
    img.alt = `Memory photo ${index + 1}`;
    img.className = "memory-thumb";
    ui.memoryPhotoStrip.appendChild(img);
  });
}

function updateMemoryStatus() {
  const n = state.memoryPhotos.length;
  ui.memoryPhotoStatus.textContent = `${n} / ${MAX_MEMORY_PHOTOS} photos — need ${MIN_MEMORY_PHOTOS}-${MAX_MEMORY_PHOTOS} on the way`;
  const ok = n >= MIN_MEMORY_PHOTOS && n <= MAX_MEMORY_PHOTOS;
  ui.openQuizBtn.disabled = !ok;
}

/**
 * Central gate for the Collect button: GPS radius + photos + quiz.
 * Calling this from one place avoids half-enabled states (less confusing for players).
 */
function updateCollectAvailability() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target || state.collected.includes(target.id)) {
    ui.collectBtn.disabled = true;
    return;
  }

  const inRange =
    state.lastDistanceMeters !== null && state.lastDistanceMeters <= COLLECTION_RADIUS_METERS;
  const photosOk =
    state.memoryPhotos.length >= MIN_MEMORY_PHOTOS &&
    state.memoryPhotos.length <= MAX_MEMORY_PHOTOS;
  const quizOk = state.checkpointQuizPassed;

  ui.collectBtn.disabled = !(inRange && photosOk && quizOk);
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
    if (state.selectedTreasureId === treasure.id) {
      state.selectedCardElement = card;
      card.classList.add("active");
    }
    ui.treasureList.appendChild(card);
  });
  updateRemainingUI();
  if (state.selectedTreasureId) {
    ui.goHuntBtn.disabled = false;
  }
}

function selectTreasure(treasureId) {
  if (state.selectedTreasureId !== treasureId) {
    resetCheckpointState();
  }
  state.selectedTreasureId = treasureId;
  [...ui.treasureList.children].forEach((node) => node.classList.remove("active"));
  state.selectedCardElement?.classList.add("active");
  ui.goHuntBtn.disabled = false;
  saveViewState();
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
  ui.transportTips.textContent = treasure.transportTips;
}

function updateScoreUI() {
  ui.scoreValue.textContent = `${state.score}`;
  ui.collectedValue.textContent = `${state.collected.length}/${TREASURES.length}`;
  const pct = Math.round((state.collected.length / TREASURES.length) * 100);
  ui.progressValue.textContent = `${pct}%`;
  updateRemainingUI();
}

function updateRemainingUI() {
  const remaining = TREASURES.length - state.collected.length;
  ui.remainingValue.textContent = `Remaining treasures: ${remaining}`;
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
  if (state.watchId !== null) return;
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

function stopGeoWatch() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
  setGpsStatus("GPS paused", "warning");
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

  if (distanceMeters <= COLLECTION_RADIUS_METERS) {
    ui.proximityStatus.textContent = "Within treasure radius";
    ui.proximityStatus.className = "status-pill success";
  } else {
    ui.proximityStatus.textContent = `Move closer (need <= ${COLLECTION_RADIUS_METERS} m)`;
    ui.proximityStatus.className = "status-pill";
  }

  updateCollectAvailability();
}

function stripHtml(value) {
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

function shuffleInPlace(items) {
  const arr = items;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Lightweight “connect the facts” UI: two columns, tap clue then matching answer.
 * Not fancy ML—just DOM and state—but it feels like a real checkpoint reward.
 */
function openCheckpointQuiz() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target?.miniGamePairs?.length) return;

  const photoCount = state.memoryPhotos.length;
  if (photoCount < MIN_MEMORY_PHOTOS || photoCount > MAX_MEMORY_PHOTOS) {
    return;
  }

  ui.quizModalSubtitle.textContent = target.name;
  ui.quizFeedback.textContent = "";
  ui.quizFeedback.classList.remove("success");

  const pairs = target.miniGamePairs.map((p) => ({ ...p }));
  const leftOrder = shuffleInPlace([...pairs]);
  const rightOrder = shuffleInPlace([...pairs]);

  const matched = new Set();
  let activePairId = null;

  const clearSelection = () => {
    activePairId = null;
    ui.quizClues.querySelectorAll(".match-card").forEach((el) => el.classList.remove("selected"));
  };

  const renderColumn = (container, side) => {
    container.innerHTML = "";
    const order = side === "clue" ? leftOrder : rightOrder;
    order.forEach((pair) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-card";
      btn.dataset.pairId = pair.id;
      btn.textContent = side === "clue" ? pair.clue : pair.match;
      btn.addEventListener("click", () => {
        if (matched.has(pair.id)) return;

        if (side === "clue") {
          clearSelection();
          activePairId = pair.id;
          btn.classList.add("selected");
          return;
        }

        // Matching side
        if (!activePairId) {
          ui.quizFeedback.textContent = "Pick a clue on the left first.";
          ui.quizFeedback.classList.remove("success");
          return;
        }

        if (pair.id === activePairId) {
          matched.add(pair.id);
          clearSelection();
          ui.quizClues.querySelectorAll(`[data-pair-id="${pair.id}"]`).forEach((el) => {
            el.classList.add("matched");
            el.disabled = true;
          });
          ui.quizMatches.querySelectorAll(`[data-pair-id="${pair.id}"]`).forEach((el) => {
            el.classList.add("matched");
            el.disabled = true;
          });

          if (matched.size === pairs.length) {
            state.checkpointQuizPassed = true;
            ui.quizFeedback.textContent = "Checkpoint cleared — you can collect the treasure!";
            ui.quizFeedback.classList.add("success");
            updateCollectAvailability();
            window.setTimeout(() => {
              ui.quizModal.classList.add("hidden");
            }, 900);
          } else {
            ui.quizFeedback.textContent = "Nice — keep pairing the rest.";
            ui.quizFeedback.classList.remove("success");
          }
        } else {
          ui.quizFeedback.textContent = "Not quite — try another match.";
          ui.quizFeedback.classList.remove("success");
          btn.classList.add("wrong");
          window.setTimeout(() => btn.classList.remove("wrong"), 450);
        }
      });
      container.appendChild(btn);
    });
  };

  renderColumn(ui.quizClues, "clue");
  renderColumn(ui.quizMatches, "match");
  ui.quizModal.classList.remove("hidden");
}

function collectTreasure() {
  const target = getTreasureById(state.selectedTreasureId);
  if (!target || state.collected.includes(target.id)) return;
  if (state.lastDistanceMeters === null || state.lastDistanceMeters > COLLECTION_RADIUS_METERS) return;
  const photosOk =
    state.memoryPhotos.length >= MIN_MEMORY_PHOTOS &&
    state.memoryPhotos.length <= MAX_MEMORY_PHOTOS;
  if (!photosOk || !state.checkpointQuizPassed) return;

  state.collected.push(target.id);
  state.score += target.points;
  saveProgress();
  saveViewState();
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

function startNextHunt() {
  resetCheckpointState();
  const nextTreasure = TREASURES.find((treasure) => !state.collected.includes(treasure.id));
  if (!nextTreasure) {
    ui.proximityStatus.textContent = "All treasures collected - hunt complete!";
    ui.proximityStatus.className = "status-pill success";
    return;
  }

  state.selectedTreasureId = nextTreasure.id;
  saveViewState();
  renderTreasureSelection();
  updateSelectedTreasureUI();
  setScreen("hunt");
  startGeoWatch();
  state.lastRouteRequestAt = 0;
  updateRouteHints(true);
  updateDistanceAndDetection();
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
  loadViewState();
  bindEvents();
  updateScoreUI();
  renderTreasureSelection();
  setupCompass();
  initMap();
  primeCollectedMarkers();
  registerServiceWorker();
  if (state.selectedTreasureId) {
    updateSelectedTreasureUI();
  }
  setScreen(state.activeScreen);
  if (state.activeScreen === "hunt" && state.selectedTreasureId) {
    startGeoWatch();
  }
  updateMemoryStatus();
  updateCollectAvailability();
};
