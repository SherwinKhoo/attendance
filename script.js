"use strict";

///////////////////////////////////
///// MARK: ELEMENTS
///////////////////////////////////

// overall container
const container = document.createElement("div");
container.id = "container";

// 1.       QR code portion
const qrCodeGenerator = document.createElement("div");

// 1.1      Header for QR code portion
const qrCodeHeader = document.createElement("h1");
qrCodeHeader.innerText = "QR Code Generator";

// 1.2      Display QR code
const qrCodeDisplay = document.createElement("canvas");
qrCodeDisplay.id = "canvas";

const qrCodeStatement = document.createElement("p");

// 1.3      Container for input and refresh
const inputAndRefreshContainer = document.createElement("div");
inputAndRefreshContainer.id = "input-and-refresh-container";

// 1.3.1    Input ID here
const inputId = document.createElement("input");
inputId.id = "input-id";
inputId.placeholder = "Enter ID here.";

// 1.3.2    Refresh button
const buttonRefreshQRCode = document.createElement("button");
buttonRefreshQRCode.id = "button-refresh-qr-code";

// 2.       Scanner portion
const qrCodeScanner = document.createElement("div");

// 2.1      Header for scanner portion
const scannerHeader = document.createElement("h1");
scannerHeader.innerText = "QR Code Scanner";

// 2.2      Camera feed
const cameraFeed = document.createElement("video");
cameraFeed.id = "camera-feed";

const cameraFeedProperties = {
  autoplay: true,
  muted: true, // for autoplay
  playsInline: true, // for iOS
  controls: false, // no playback controls needed
};
Object.entries(cameraFeedProperties).forEach(([key, value]) => {
  cameraFeed[key] = value;
});

// 2.3      Camera status
const cameraFeedStatement = document.createElement("p");
cameraFeedStatement.id = "camera-feed-statement";

// 2.4 Camera feed button container
const cameraFeedButtonContainer = document.createElement("div");
cameraFeedButtonContainer.id = "camera-Feed-Button-Container";

// 2.4.1 Camera start and stop button
const buttonCameraFeedStartStop = document.createElement("button");
buttonCameraFeedStartStop.id = "button-camera-feed-start-stop";

// 2.4.2 Scan button
const buttonCameraFeedScan = document.createElement("button");
buttonCameraFeedScan.id = "button-camera-feed-scan";

// 2.5 Table for reference
const tableOfIds = document.createElement("table");
tableOfIds.id = "table-of-ids";

// 2.6 Purge data
const buttonPurgeData = document.createElement("button");
buttonPurgeData.id = "button-purge-data";

///////////////////////////////////
///// MARK: APPEND
///////////////////////////////////

document.body.append(container);

container.append(qrCodeGenerator, qrCodeScanner);

qrCodeGenerator.append(
  qrCodeHeader,
  qrCodeDisplay,
  qrCodeStatement,
  inputAndRefreshContainer
);

inputAndRefreshContainer.append(inputId, buttonRefreshQRCode);

qrCodeScanner.append(
  scannerHeader,
  cameraFeed,
  cameraFeedStatement,
  cameraFeedButtonContainer,
  tableOfIds,
  buttonPurgeData
);

cameraFeedButtonContainer.append(
  buttonCameraFeedStartStop,
  buttonCameraFeedScan
);

///////////////////////////////////
///// MARK: CREATE QR CODE
///////////////////////////////////

// button clicked
// check or ask for geolocation permission; get coordinates when granted
// check if string in input box fits regex; error message
// create json
// generate QR code

///////////////////////////////////
///// MARK: Settings
///////////////////////////////////

// state
const userId = inputId.value;
let deviceGeolocation = []; // array saves space
let time = "";

const qrCodeStatementOriginal = "Please generate a new QR code.";
qrCodeStatement.innerText = qrCodeStatementOriginal;

const buttonRefreshQRCodeOriginal = "Get new QR code";
buttonRefreshQRCode.innerText = buttonRefreshQRCodeOriginal;

const cameraFeedStatementOriginal =
  "Please start the camera to begin scanning.";
cameraFeedStatement.innerText = cameraFeedStatementOriginal;

const buttonCameraFeedStartStopOriginal = "Start camera";
buttonCameraFeedStartStop.innerText = buttonCameraFeedStartStopOriginal;

const buttonCameraFeedScanOriginal = "Scan";
buttonCameraFeedScan.innerText = buttonCameraFeedScanOriginal;
buttonCameraFeedScan.disabled = true;

buttonPurgeData.innerText = "Clear data";

let countdownInterval = null;

let isCameraActive = false;
let mediaStream = null;

// config
const CONFIG = {
  DURATION_COUNTDOWN: 15, // seconds
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
  QR_VERSION: 6, // smallest for this data set
  QR_ERROR_CORRECTION: "H", // high for quick scanning of consecutive qr codes
  QR_MASK_PATTERN: 2, // apparently used in factories for quick scanning
  TIME_DATE_OPTIONS: {
    weekday: "long", // Full day name (e.g., "Monday")
    day: "numeric", // Day of the month (e.g., "1")
    month: "long", // Full month name (e.g., "January")
    year: "numeric", // Full year (e.g., "2023")
  },
  TIME_TIME_OPTIONS: {
    hour: "2-digit", // Hour (e.g., "12")
    minute: "2-digit", // Minute (e.g., "34")
    second: "2-digit", // Second (e.g., "56")
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // auto detect
    timeZoneName: "short", // Timezone abbreviation (e.g., "EST")
  },
  USER_ID_REGEX: /^ABC1-(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/, // always 8 characters, start with "ABC1-", and 3 numbers between 001 and 999
};

///////////////////////////////////
///// MARK: Buttons
///////////////////////////////////

buttonRefreshQRCode.addEventListener("click", handleQRCodeRefreshClick);
buttonCameraFeedStartStop.addEventListener("click", toggleCamera);
buttonCameraFeedScan.addEventListener("click", handleScan);
buttonPurgeData.addEventListener("click", handlePurgeData);

///////////////////////////////////
///// MARK: Geolocation
///////////////////////////////////

async function getDeviceLocation() {
  if ("permissions" in navigator) {
    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      qrCodeStatement.innerText = `Geolocation: ${permission.state}. ${
        permission.state === "granted"
          ? "Fetching location..."
          : "Geolocation access is required."
      }`;
      console.log(qrCodeStatement.innerText);
    } catch (error) {
      console.warn("Permissions API not fully supported", error);
    }
  }

  try {
    const deviceLocation = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let errorMessage = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Geolocation required. Please enable browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Request timed out.";
              break;
            default:
              errorMessage = `Could not retrieve location: ${error.message}`;
          }
          reject(new Error(errorMessage));
        },
        CONFIG.GEOLOCATION_OPTIONS // change options in settings above
      );
    });
    return deviceLocation;
  } catch (error) {
    qrCodeStatement.innerText = error.message;
    console.error(error.message);
    throw error;
  }
}

///////////////////////////////////
///// MARK: Refresh QR Code
///////////////////////////////////

async function handleQRCodeRefreshClick() {
  try {
    // clear countdown
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    // reset button text
    buttonRefreshQRCode.disabled = false;
    buttonRefreshQRCode.innerText = buttonRefreshQRCodeOriginal;

    // input string validation
    const userId = inputId.value;
    if (!CONFIG.USER_ID_REGEX.test(userId)) {
      qrCodeStatement.innerText = "Invalid ID format: Use ABC1-001 to ABC1-999";
      qrCodeDisplay
        .getContext("2d")
        .clearRect(0, 0, qrCodeDisplay.width, qrCodeDisplay.height);
      return;
    }

    const location = await getDeviceLocation();
    deviceGeolocation = [
      Number(location.coords.latitude.toFixed(6)),
      Number(location.coords.longitude.toFixed(6)),
    ];
    time = new Date().toISOString();

    // array is smaller // spread operator to prevent accidental modification of original data
    const qrCodeGeneratedByUser = [userId, time, ...deviceGeolocation];

    console.log("QR Payload:", JSON.stringify(qrCodeGeneratedByUser));

    // always clear before drawing new QR code
    const ctx = qrCodeDisplay.getContext("2d");
    ctx.clearRect(0, 0, qrCodeDisplay.width, qrCodeDisplay.height);

    // refresh QR code
    await QRCode.toCanvas(
      qrCodeDisplay,
      JSON.stringify(qrCodeGeneratedByUser),
      {
        version: CONFIG.QR_VERSION,
        errorCorrectionLevel: CONFIG.QR_ERROR_CORRECTION,
        maskPattern: CONFIG.QR_MASK_PATTERN,
        margin: 2,
        width: qrCodeDisplay.clientWidth, // current container width (canvas)
        color: {
          dark: "#000000", // black modules
          light: "#ffffff", // white background
        },
      }
    );

    const deviceLocationDateTime = new Date(time);
    const deviceLocationDatePortion = new Intl.DateTimeFormat(
      "en-US",
      CONFIG.TIME_DATE_OPTIONS
    ).format(deviceLocationDateTime);
    const deviceLocationDTimePortion = new Intl.DateTimeFormat(
      "en-US",
      CONFIG.TIME_TIME_OPTIONS
    ).format(deviceLocationDateTime);

    const humanReadable = `${deviceLocationDatePortion}\n${deviceLocationDTimePortion}`;
    qrCodeStatement.innerText = `${humanReadable}`;
    buttonRefreshQRCode.disabled = true;
    startCountdown();
  } catch (error) {
    deviceGeolocation = [];
    time = "";
    // Clear canvas on error
    const ctx = qrCodeDisplay.getContext("2d");
    ctx.clearRect(0, 0, qrCodeDisplay.width, qrCodeDisplay.height);
    console.error("QR Refresh Error:", error);
  }
}

function startCountdown() {
  let secondsRemaining = CONFIG.DURATION_COUNTDOWN;

  countdownInterval = setInterval(() => {
    buttonRefreshQRCode.innerText = `Scan within: ${secondsRemaining}s`;

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      buttonRefreshQRCode.disabled = false;
      buttonRefreshQRCode.innerText = buttonRefreshQRCodeOriginal;
      qrCodeStatement.innerText = qrCodeStatementOriginal;
      const ctx = qrCodeDisplay.getContext("2d");
      ctx.clearRect(0, 0, qrCodeDisplay.width, qrCodeDisplay.height);
    }
    secondsRemaining--;
  }, 1000);
}

///////////////////////////////////
///// MARK: SCAN QR CODE
///////////////////////////////////

// 1) Compare the time portion of the QR code to the scanning device's own (both must be in UTC "Zulu" format).
// // The time difference must be 15 seconds or less.
// 2) Compare the location of both devices (coordinates up to 6 decimal places).
// // The physical distance must be 50 metres or less.
// 3) Update cameraFeedStatement with either "Success" or "Failed".
// // The checks are logged in the console in the format "Category : Success / Failed, difference".
// // When it is successful, the text will be in green. When failed, the text will be in red.
// 4) The information in each scan is added to localStorage (tentatively named "ASDF").
// // The information is from the QR code. It is stored in the format (accounting for multiple attempts)
// 5) After each scan, tableOfIds is populated with IDs, and the latest attempt's status.
// // It is preferable that the table can be sorted by either ID or status.
// 6) When the data is not needed anymore, clicking on buttonPurgeData will purge the data.
// // There will be a pop-up message. Confirming will clear ASDF from localStorage, cancelling will do nothing.

///////////////////////////////////
///// MARK: Camera
///////////////////////////////////

async function toggleCamera() {
  try {
    if (!isCameraActive) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraFeed.srcObject = mediaStream;
      await cameraFeed.play();
      isCameraActive = true;
      buttonCameraFeedStartStop.textContent = "Stop camera";
      buttonCameraFeedScan.disabled = false;
      cameraFeedStatement.textContent =
        "Camera in operation; please proceed to scan.";
    } else {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      cameraFeed.srcObject = null;
      isCameraActive = false;
      buttonCameraFeedStartStop.textContent = "Start camera";
      buttonCameraFeedScan.disabled = true;
      cameraFeedStatement.textContent = cameraFeedStatementOriginal;
    }
  } catch (error) {
    console.error("Camera Error:", error);
    cameraFeedStatement.textContent = "Error accessing camera.";
    isCameraActive = false;
    buttonCameraFeedStartStop.textContent = "Start camera";
    buttonCameraFeedScan.disabled = true;
  }
}

///////////////////////////////////
///// MARK: Scan and Validation
///////////////////////////////////

async function handleScan() {
  if (!isCameraActive) return;

  // Validate scanner ID if localStorage is empty
  const scannerId = inputId.value.trim();
  const isFirstScan = localStorage.length === 0;

  if (isFirstScan && !CONFIG.USER_ID_REGEX.test(scannerId)) {
    cameraFeedStatement.textContent = "Invalid ID: Use ABC1-001 to ABC1-999";
    cameraFeedStatement.style.color = "red";
    return;
  }

  try {
    // Capture QR code
    const canvas = document.createElement("canvas");
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
    if (!qrCode) {
      updateScanStatus("No QR code detected.", false);
      return;
    }

    // Parse QR data
    let qrData;
    try {
      qrData = JSON.parse(qrCode.data);
    } catch (error) {
      updateScanStatus("Invalid QR data.", false);
      return;
    }

    if (!validateQRData(qrData)) {
      updateScanStatus("Invalid QR format.", false);
      return;
    }

    const [qrUserId, qrTime, qrLat, qrLon] = qrData;
    const timeCheck = checkTimeDifference(qrTime);
    const locationCheck = await checkLocation([qrLat, qrLon]);

    // Determine scan status
    const overallStatus =
      timeCheck.success && locationCheck.success ? "Success" : "Failed";
    updateScanStatus(overallStatus, overallStatus === "Success");

    // Save to localStorage under scanner's ID
    saveToLocalStorage(
      qrUserId,
      overallStatus,
      locationCheck.coords,
      scannerId
    );
    updateTableOfIds(scannerId);
  } catch (error) {
    console.error("Scan Error:", error);
    updateScanStatus("Scan failed - check permissions", false);
  }
}

function validateQRData(data) {
  return (
    Array.isArray(data) &&
    data.length === 4 &&
    typeof data[0] === "string" &&
    typeof data[1] === "string" &&
    typeof data[2] === "number" &&
    typeof data[3] === "number"
  );
}

function checkTimeDifference(qrTime) {
  const currentTime = new Date();
  const qrTimeDate = new Date(qrTime);
  const difference = Math.abs(currentTime - qrTimeDate);
  const success = difference <= 15000;
  console.log(`Time Check: ${success ? "Success" : "Failed"}, ${difference}ms`);
  return { success, difference };
}

async function checkLocation(qrCoords) {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        CONFIG.GEOLOCATION_OPTIONS
      );
    });
    const currentCoords = [
      Number(position.coords.latitude.toFixed(6)),
      Number(position.coords.longitude.toFixed(6)),
    ];
    const distance = calculateHaversineDistance(qrCoords, currentCoords);
    const success = distance <= 50;
    console.log(
      `Location Check: ${success ? "Success" : "Failed"}, ${distance}m`
    );
    return { success, distance, coords: currentCoords };
  } catch (error) {
    console.error("Geolocation Error:", error);
    throw error;
  }
}

function calculateHaversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateScanStatus(message, isSuccess) {
  cameraFeedStatement.textContent = message;
  cameraFeedStatement.style.color = isSuccess ? "green" : "red";
}

///////////////////////////////////
///// MARK: Local Storage
///////////////////////////////////

// localStorage
function saveToLocalStorage(id, status, coords, scannerId) {
  const currentTime = new Date().toISOString();
  const attempt = [status, currentTime, coords];

  let data = JSON.parse(localStorage.getItem(scannerId)) || [];
  const entry = data.find((e) => e.id === id);
  if (entry) {
    entry.attempts.push(attempt);
  } else {
    data.push({ id, attempts: [attempt] });
  }
  localStorage.setItem(scannerId, JSON.stringify(data));
}

// purge localStorage
function handlePurgeData() {
  const scannerId = inputId.value.trim();
  if (confirm(`Clear all data for ${scannerId}?`)) {
    localStorage.removeItem(scannerId);
    updateTableOfIds(scannerId);
  }
}

///////////////////////////////////
///// MARK: Table
///////////////////////////////////

function updateTableOfIds(scannerId) {
  const data = JSON.parse(localStorage.getItem(scannerId)) || [];
  tableOfIds.innerHTML = `
    <tr>
      <th class="sortable" data-sort-key="id">ID</th>
      <th class="sortable" data-sort-key="status">Latest Status</th>
    </tr>
  `;

  data.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.id}</td>
      <td>${entry.attempts.slice(-1)[0][0]}</td>
    `;
    tableOfIds.appendChild(row);
  });

  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", () =>
      sortTable(header.dataset.sortKey, scannerId)
    );
  });
}

function sortTable(sortKey, scannerId) {
  let data = JSON.parse(localStorage.getItem(scannerId)) || [];
  data.sort((a, b) => {
    if (sortKey === "id") return a.id.localeCompare(b.id);
    if (sortKey === "status") {
      const aStatus = a.attempts.slice(-1)[0][0];
      const bStatus = b.attempts.slice(-1)[0][0];
      return aStatus.localeCompare(bStatus);
    }
    return 0;
  });
  localStorage.setItem(scannerId, JSON.stringify(data));
  updateTableOfIds(scannerId);
}

// Update table when ID changes
inputId.addEventListener("input", () => {
  const scannerId = inputId.value.trim();
  if (CONFIG.USER_ID_REGEX.test(scannerId)) {
    updateTableOfIds(scannerId);
  }
});
