// នាំចូល Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// --- Global Variables ---
let dbAttendance, dbLeave, authAttendance;
let dbAttendanceRTDB;
let allEmployees = [];
let currentMonthRecords = [];
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;
let allShiftRules = null;
let allCheckInLateRules = null;
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let currentConfirmCallback = null;
let timeCheckInterval = null;

// --- អថេរសម្រាប់គ្រប់គ្រងម៉ោង Server Time ---
let timeOffset = 0;
let isTimeSynced = false;

// --- អថេរសម្រាប់គ្រប់គ្រង Session (Device Lock) ---
let sessionCollectionRef = null;
let sessionListener = null;
let currentDeviceId = null;

// --- AI & Camera Global Variables ---
let modelsLoaded = false;
let currentUserFaceMatcher = null;
let currentScanAction = null;
let videoStream = null;
const FACE_MATCH_THRESHOLD = 0.5;

// --- Map សម្រាប់បកប្រែ Duration ជាអក្សរខ្មែរ ---
const durationMap = {
  មួយថ្ងៃកន្លះ: 1.5,
  ពីរថ្ងៃ: 2,
  ពីរថ្ងៃកន្លះ: 2.5,
  បីថ្ងៃ: 3,
  បីថ្ងៃកន្លះ: 3.5,
  បួនថ្ងៃ: 4,
  បួនថ្ងៃកន្លះ: 4.5,
  ប្រាំថ្ងៃ: 5,
  ប្រាំថ្ងៃកន្លះ: 5.5,
  ប្រាំមួយថ្ងៃ: 6,
  ប្រាំមួយថ្ងៃកន្លះ: 6.5,
  ប្រាំពីរថ្ងៃ: 7,
};

// --- Google Sheet Configuration ---
const SHEET_ID = "1eRyPoifzyvB4oBmruNyXcoKMKPRqjk6xDD6-bPNW6pc";
const SHEET_NAME = "DIList";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=E9:AJ`;
const COL_INDEX = {
  ID: 0,
  GROUP: 2,
  NAME: 7,
  GENDER: 9,
  GRADE: 13,
  DEPT: 14,
  SHIFT_MON: 24,
  SHIFT_TUE: 25,
  SHIFT_WED: 26,
  SHIFT_THU: 27,
  SHIFT_FRI: 28,
  SHIFT_SAT: 29,
  SHIFT_SUN: 30,
  PHOTO: 31,
};

// --- Firebase Configuration (Attendance) ---
const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
  databaseURL: "https://checkme-10e18-default-rtdb.firebaseio.com",
  projectId: "checkme-10e18",
  storageBucket: "checkme-10e18.firebasestorage.app",
  messagingSenderId: "1030447497157",
  appId: "1:1030447497157:web:9792086df1e864559fd5ac",
  measurementId: "G-QCJ2JH4WH6",
};

// --- Firebase Configuration (Leave Requests) ---
const firebaseConfigLeave = {
  apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk",
  authDomain: "dipermisstion.firebaseapp.com",
  projectId: "dipermisstion",
  storageBucket: "dipermisstion.firebasestorage.app",
  messagingSenderId: "512999406057",
  appId: "1:512999406057:web:953a281ab9dde7a9a0f378",
  measurementId: "G-KDPHXZ7H4B",
};

// --- តំបន់ទីតាំង (Polygon Geofence) ---
const allowedAreaCoords = [
  [11.415206789703271, 104.7642005060435],
  [11.41524294053174, 104.76409925265823],
  [11.413750665249953, 104.7633762203053],
  [11.41370399757057, 104.7634714387206],
];

// --- DOM Elements ---
const loadingView = document.getElementById("loadingView");
const loadingText = document.getElementById("loadingText");
const employeeListView = document.getElementById("employeeListView");

const homeView = document.getElementById("homeView");
const historyView = document.getElementById("historyView");
const footerNav = document.getElementById("footerNav");
const navHomeButton = document.getElementById("navHomeButton");
const navHistoryButton = document.getElementById("navHistoryButton");

const searchInput = document.getElementById("searchInput");
const employeeListContainer = document.getElementById("employeeListContainer");

const welcomeMessage = document.getElementById("welcomeMessage");
const logoutButton = document.getElementById("logoutButton");
const exitAppButton = document.getElementById("exitAppButton");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileId = document.getElementById("profileId");
const profileGender = document.getElementById("profileGender");
const profileDepartment = document.getElementById("profileDepartment");
const profileGroup = document.getElementById("profileGroup");
const profileGrade = document.getElementById("profileGrade");
const profileShift = document.getElementById("profileShift");
const checkInButton = document.getElementById("checkInButton");
const checkOutButton = document.getElementById("checkOutButton");
const attendanceStatus = document.getElementById("attendanceStatus");

const historyContainer = document.getElementById("historyContainer");
const noHistoryRow = document.getElementById("noHistoryRow");
const monthlyHistoryContainer = document.getElementById(
  "monthlyHistoryContainer"
);
const noMonthlyHistoryRow = document.getElementById("noMonthlyHistoryRow");

const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalActions = document.getElementById("modalActions");
const modalCancelButton = document.getElementById("modalCancelButton");
const modalConfirmButton = document.getElementById("modalConfirmButton");

const cameraModal = document.getElementById("cameraModal");
const videoElement = document.getElementById("videoElement");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCloseButton = document.getElementById("cameraCloseButton");
const cameraLoadingText = document.getElementById("cameraLoadingText");
const cameraHelpText = document.getElementById("cameraHelpText");
const captureButton = document.getElementById("captureButton");

const employeeListHeader = document.getElementById("employeeListHeader");
const employeeListHelpText = document.getElementById("employeeListHelpText");
const searchContainer = document.getElementById("searchContainer");

const employeeListContent = document.getElementById("employeeListContent");

// --- Helper Functions ---

function getSyncedTime() {
  if (!isTimeSynced) {
    return new Date();
  }
  return new Date(Date.now() + timeOffset);
}

function syncFirebaseTime() {
  return new Promise((resolve, reject) => {
    loadingText.textContent = "កំពុងធ្វើសមកាលកម្មម៉ោង...";
    const offsetRef = ref(dbAttendanceRTDB, ".info/serverTimeOffset");
    onValue(
      offsetRef,
      (snapshot) => {
        timeOffset = snapshot.val();
        isTimeSynced = true;
        console.log(`Time synced. Offset is: ${timeOffset}ms`);
        resolve();
      },
      (error) => {
        console.error("Failed to sync Firebase time:", error);
        isTimeSynced = false;
        showMessage(
          "បញ្ហាម៉ោង",
          `មិនអាចធ្វើសមកាលកម្មម៉ោង Firebase បានទេ។ Error: ${error.message}`,
          true
        );
        reject(error);
      }
    );
  });
}


function changeView(viewId) {
  loadingView.style.display = "none";
  employeeListView.style.display = "none";
  homeView.style.display = "none";
  historyView.style.display = "none";
  footerNav.style.display = "none";

  if (viewId === "loadingView") {
    loadingView.style.display = "flex";
  } else if (viewId === "employeeListView") {
    employeeListView.style.display = "flex";
  } else if (viewId === "homeView") {
    homeView.style.display = "flex";
    footerNav.style.display = "block";
  } else if (viewId === "historyView") {
    historyView.style.display = "flex";
    footerNav.style.display = "block";
  }
}

function showMessage(title, message, isError = false) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalTitle.classList.toggle("text-red-600", isError);
  modalTitle.classList.toggle("text-gray-800", !isError);

  modalConfirmButton.textContent = "យល់ព្រម";
  modalConfirmButton.className =
    "w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 col-span-2";
  modalCancelButton.style.display = "none";

  currentConfirmCallback = null;

  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function showConfirmation(title, message, confirmText, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalTitle.classList.remove("text-red-600");
  modalTitle.classList.add("text-gray-800");

  modalConfirmButton.textContent = confirmText;
  modalConfirmButton.className =
    "w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50";
  modalCancelButton.style.display = "block";

  currentConfirmCallback = onConfirm;

  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function hideMessage() {
  customModal.classList.add("modal-hidden");
  customModal.classList.remove("modal-visible");
  currentConfirmCallback = null;
}

function getTodayDateString(date = getSyncedTime()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = getSyncedTime();
  const year = now.getFullYear();
  const monthString = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDayString = String(lastDay).padStart(2, "0");
  const startOfMonth = `${year}-${monthString}-01`;
  const endOfMonth = `${year}-${monthString}-${lastDayString}`;
  console.log(`Current month range: ${startOfMonth} to ${endOfMonth}`);
  return { startOfMonth, endOfMonth };
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(date) {
  if (!date) return "";
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    console.error("Invalid date for formatDate:", date);
    return "Invalid Date";
  }
}

const monthMap = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseLeaveDate(dateString) {
  if (!dateString) return null;
  try {
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) return null;

    return new Date(year, month, day);
  } catch (e) {
    console.error("Failed to parse leave date:", dateString, e);
    return null;
  }
}

function convertTimeFormat(timeString) {
  if (!timeString) return null;

  try {
    const parts = timeString.match(/(\d+):(\d+)\s(AM|PM)/i);
    if (!parts) return null;

    let [_, hours, minutes, ampm] = parts;
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    if (ampm.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    }
    if (ampm.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }
    return hours + minutes / 60;
  } catch (e) {
    console.error("Failed to convert time format:", timeString, e);
    return null;
  }
}

function checkShiftTime(shiftType, checkType) {
  if (!allShiftRules) {
    console.warn("Shift rules not loaded from Firebase yet.");
    return false;
  }

  if (!shiftType || shiftType === "N/A") {
    console.warn(`វេនមិនបានកំណត់ (N/A)។ មិនអនុញ្ញាតឱ្យស្កេន។`);
    return false;
  }
  if (shiftType === "Uptime") {
    return true;
  }

  const rules = allShiftRules[shiftType];
  if (!rules) {
    console.warn(`វេនមិនស្គាល់: "${shiftType}" (រកមិនឃើញក្នុង Firebase)។`);
    return false;
  }

  const now = getSyncedTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + currentMinute / 60;

  let startTimeString, endTimeString;
  if (checkType === "checkIn") {
    startTimeString = rules.StartCheckIn;
    endTimeString = rules.EndCheckin;
  } else {
    startTimeString = rules.StartCheckOut;
    endTimeString = rules.EndCheckOut;
  }

  if (!startTimeString || !endTimeString) {
    console.warn(
      `បាត់ Start/End time ក្នុង Firebase សម្រាប់ ${shiftType} -> ${checkType}`
    );
    return false;
  }

  const min = convertTimeFormat(startTimeString);
  const max = convertTimeFormat(endTimeString);

  if (min === null || max === null) {
    console.warn(
      `Format ម៉ោងមិនត្រឹមត្រូវក្នុង Firebase: ${startTimeString} ឬ ${endTimeString}`
    );
    return false;
  }

  if (currentTime >= min && currentTime <= max) {
    return true;
  }

  console.log(
    `ក្រៅម៉ោង: ម៉ោងបច្ចុប្បន្ន (${currentTime.toFixed(
      2
    )}) មិនស្ថិតក្នុងចន្លោះ [${min.toFixed(2)}, ${max.toFixed(
      2
    )}] សម្រាប់វេន "${shiftType}"`
  );
  return false;
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                "សូមអនុញ្ញាតឱ្យប្រើប្រាស់ទីតាំង។ ប្រសិនបើអ្នកបាន Block, សូមចូលទៅកាន់ Site Settings របស់ Browser ដើម្បី Allow។"
              )
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("មិនអាចទាញយកទីតាំងបានទេ។"));
            break;
          case error.TIMEOUT:
            reject(new Error("អស់ពេលកំណត់ក្នុងការទាញយកទីតាំង។"));
            break;
          default:
            reject(new Error("មានបញ្ហាក្នុងការទាញយកទីតាំង។"));
        }
      },
      options
    );
  });
}

function isInsideArea(lat, lon) {
  const polygon = allowedAreaCoords;
  let isInside = false;
  const x = lon;
  const y = lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const viy = polygon[i][0];
    const vix = polygon[i][1];
    const vjy = polygon[j][0];
    const vjx = polygon[j][1];

    const intersect =
      viy > y !== vjy > y && x < ((vjx - vix) * (y - viy)) / (vjy - viy) + vix;

    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function isShortData(htmlString) {
  if (!htmlString) return true;
  if (htmlString.includes("text-blue-600")) {
    return false;
  }
  return true;
}

async function fetchAllLeaveForMonth(employeeId) {
  if (!dbLeave) return [];

  const leaveCollectionPath =
    "/artifacts/default-app-id/public/data/leave_requests";
  const outCollectionPath =
    "/artifacts/default-app-id/public/data/out_requests";

  const { startOfMonth, endOfMonth } = getCurrentMonthRange();
  const startMonthDate = new Date(startOfMonth + "T00:00:00");
  const endMonthDate = new Date(endOfMonth + "T23:59:59");

  let allLeaveRecords = [];

  try {
    const qLeave = query(
      collection(dbLeave, leaveCollectionPath),
      where("userId", "==", employeeId),
      where("status", "==", "approved")
    );
    const leaveSnapshot = await getDocs(qLeave);

    leaveSnapshot.forEach((doc) => {
      const data = doc.data();
      const startDate = parseLeaveDate(data.startDate);
      if (!startDate) return;

      const durationStr = data.duration;
      const reason = data.reason || "(មិនមានមូលហេតុ)";
      const durationNum = durationMap[durationStr] || parseFloat(durationStr);
      const isMultiDay = !isNaN(durationNum);

      if (isMultiDay) {
        const daysToSpan = Math.ceil(durationNum);
        for (let i = 0; i < daysToSpan; i++) {
          const currentLeaveDate = new Date(startDate);
          currentLeaveDate.setDate(startDate.getDate() + i);

          if (
            currentLeaveDate >= startMonthDate &&
            currentLeaveDate <= endMonthDate
          ) {
            let leaveType = `ច្បាប់ ${durationStr}`;
            const isHalfDay = durationNum % 1 !== 0;

            if (isHalfDay && i === daysToSpan - 1) {
              allLeaveRecords.push({
                date: getTodayDateString(currentLeaveDate),
                formattedDate: formatDate(currentLeaveDate),
                checkIn: `${leaveType} (${reason})`,
                checkOut: null,
              });
            } else {
              allLeaveRecords.push({
                date: getTodayDateString(currentLeaveDate),
                formattedDate: formatDate(currentLeaveDate),
                checkIn: `${leaveType} (${reason})`,
                checkOut: `${leaveType} (${reason})`,
              });
            }
          }
        }
      } else {
        if (startDate >= startMonthDate && startDate <= endMonthDate) {
          const dateStr = getTodayDateString(startDate);
          const formatted = formatDate(startDate);
          const leaveLabel = `ច្បាប់ ${durationStr} (${reason})`;

          if (durationStr === "មួយថ្ងៃ" || durationStr === "មួយយប់") {
            allLeaveRecords.push({
              date: dateStr,
              formattedDate: formatted,
              checkIn: leaveLabel,
              checkOut: leaveLabel,
            });
          } else if (durationStr === "មួយព្រឹក") {
            allLeaveRecords.push({
              date: dateStr,
              formattedDate: formatted,
              checkIn: leaveLabel,
              checkOut: leaveLabel,
            });
          } else if (durationStr === "មួយរសៀល") {
            allLeaveRecords.push({
              date: dateStr,
              formattedDate: formatted,
              checkIn: leaveLabel,
              checkOut: leaveLabel,
            });
          }
        }
      }
    });
  } catch (e) {
    console.error("Error fetching 'leave_requests' for month", e);
  }

  try {
    const qOut = query(
      collection(dbLeave, outCollectionPath),
      where("userId", "==", employeeId),
      where("status", "==", "approved")
    );
    const outSnapshot = await getDocs(qOut);

    outSnapshot.forEach((doc) => {
      const data = doc.data();
      const startDate = parseLeaveDate(data.startDate);
      if (!startDate) return;

      if (startDate >= startMonthDate && startDate <= endMonthDate) {
        const dateStr = getTodayDateString(startDate);
        const formatted = formatDate(startDate);
        const leaveType = data.duration || "N/A";
        const reason = data.reason || "(មិនមានមូលហេតុ)";
        const leaveLabel = `ច្បាប់ ${leaveType} (${reason})`;

        if (leaveType === "មួយថ្ងៃ") {
          allLeaveRecords.push({
            date: dateStr,
            formattedDate: formatted,
            checkIn: leaveLabel,
            checkOut: leaveLabel,
          });
        } else if (leaveType === "មួយព្រឹក") {
          allLeaveRecords.push({
            date: dateStr,
            formattedDate: formatted,
            checkIn: leaveLabel,
            checkOut: leaveLabel,
          });
        } else if (leaveType === "មួយរសៀល") {
          allLeaveRecords.push({
            date: dateStr,
            formattedDate: formatted,
            checkIn: leaveLabel,
            checkOut: leaveLabel,
          });
        }
      }
    });
  } catch (e) {
    console.error("Error fetching 'out_requests' for month", e);
  }

  return allLeaveRecords;
}

function mergeAttendanceAndLeave(attendanceRecords, leaveRecords) {
  const mergedMap = new Map();

  for (const record of attendanceRecords) {
    mergedMap.set(record.date, { ...record });
  }

  for (const leave of leaveRecords) {
    const existing = mergedMap.get(leave.date);
    if (existing) {
      if (leave.checkIn && !existing.checkIn) {
        existing.checkIn = leave.checkIn;
      }
      if (leave.checkOut && !existing.checkOut) {
        existing.checkOut = leave.checkOut;
      }
    } else {
      mergedMap.set(leave.date, { ...leave });
    }
  }

  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(attendanceRecords, leaveRecords);

  const todayString = getTodayDateString();
  currentMonthRecords.sort((a, b) => {
    const aDate = a.date || "";
    const bDate = b.date || "";
    const isAToday = aDate === todayString;
    const isBToday = bDate === todayString;

    if (isAToday && !isBToday) {
      return -1;
    } else if (!isAToday && isBToday) {
      return 1;
    } else {
      return bDate.localeCompare(aDate);
    }
  });

  console.log(
    `History Rendered: ${currentMonthRecords.length} records (Merged).`
  );

  renderTodayHistory();
  renderMonthlyHistory();
  await updateButtonState();
}

// --- AI & Camera Functions ---

async function loadAIModels() {
  const MODEL_URL = "./models";
  loadingText.textContent = "កំពុងទាញយក AI Models...";

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL, {
      useDiskCache: true,
    });
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL, {
      useDiskCache: true,
    });
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL, {
      useDiskCache: true,
    });

    console.log("AI Models Loaded");
    modelsLoaded = true;
    await fetchGoogleSheetData();
  } catch (e) {
    console.error("Error loading AI models", e);
    showMessage(
      "បញ្ហាធ្ងន់ធ្ងរ",
      `មិនអាចទាញយក AI Models បានទេ។ សូមពិនិត្យ Folder 'models' (m តូច)។ Error: ${e.message}`,
      true
    );
  }
}

async function prepareFaceMatcher(imageUrl) {
  currentUserFaceMatcher = null;
  if (!imageUrl || imageUrl.includes("placehold.co")) {
    console.warn("No valid profile photo. Face scan will be disabled.");
    return;
  }

  try {
    profileName.textContent = "កំពុងវិភាគរូបថត...";
    const img = await faceapi.fetchImage(imageUrl);
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      currentUserFaceMatcher = new faceapi.FaceMatcher(detection.descriptor);
      console.log("Face matcher created successfully.");
    } else {
      console.warn("Could not find a face in the profile photo.");
      showMessage(
        "បញ្ហារូបថត",
        "រកមិនឃើញមុខនៅក្នុងរូបថត Profile ទេ។ មិនអាចប្រើការស្កេនមុខបានទេ។",
        true
      );
    }
  } catch (e) {
    console.error("Error loading profile photo for face matching:", e);
    showMessage(
      "បញ្ហារូបថត",
      `មានបញ្ហាក្នុងការទាញយករូបថត Profile: ${e.message}`,
      true
    );
  } finally {
    if (currentUser) {
      profileName.textContent = currentUser.name;
    }
  }
}

async function checkLeaveStatus(employeeId, checkType) {
  if (!dbLeave) {
    console.warn("Leave Database (dbLeave) is not initialized.");
    return null;
  }

  const todayString = formatDate(getSyncedTime());
  const leaveCollectionPath =
    "/artifacts/default-app-id/public/data/out_requests";

  const q = query(
    collection(dbLeave, leaveCollectionPath),
    where("userId", "==", employeeId),
    where("startDate", "==", todayString),
    where("status", "==", "approved")
  );

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const leaveData = querySnapshot.docs[0].data();
    const leaveType = leaveData.duration || "N/A";
    const reason = leaveData.reason || "(មិនមានមូលហេតុ)";

    if (leaveType === "មួយថ្ងៃ") {
      return { blocked: true, reason: `ច្បាប់ចេញក្រៅមួយថ្ងៃ (${reason})` };
    }
    if (leaveType === "មួយព្រឹក") {
      return { blocked: true, reason: `ច្បាប់ចេញក្រៅមួយព្រឹក (${reason})` };
    }
    if (leaveType === "មួយរសៀល") {
      return { blocked: true, reason: `ច្បាប់ចេញក្រៅមួយរសៀល (${reason})` };
    }

    return null;
  } catch (error) {
    console.error("Error checking [out_requests] status:", error);
    showMessage(
      "បញ្ហាពិនិត្យច្បាប់",
      `មិនអាចទាញទិន្នន័យច្បាប់ (out_requests) បានទេ៖ ${error.message}`,
      true
    );
    return { blocked: true, reason: "Error checking leave status." };
  }
}

async function checkFullLeaveStatus(employeeId, checkType) {
  if (!dbLeave) {
    console.warn("Leave Database (dbLeave) is not initialized.");
    return null;
  }

  const leaveCollectionPath =
    "/artifacts/default-app-id/public/data/leave_requests";

  const today = getSyncedTime();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const todayString_DD_Mon_YYYY = formatDate(today);

  const q = query(
    collection(dbLeave, leaveCollectionPath),
    where("userId", "==", employeeId),
    where("status", "==", "approved")
  );

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const durationStr = data.duration;
      const reason = data.reason || "(មិនមានមូលហេតុ)";
      const startDateStr = data.startDate;

      const durationNum = durationMap[durationStr] || parseFloat(durationStr);
      const isMultiDay = !isNaN(durationNum);

      if (isMultiDay) {
        const startLeaveDate = parseLeaveDate(startDateStr);
        if (!startLeaveDate) {
          continue;
        }

        const startTimestamp = startLeaveDate.getTime();
        const daysToSpan = Math.ceil(durationNum);
        const endLeaveDate = new Date(startLeaveDate);
        endLeaveDate.setDate(startLeaveDate.getDate() + daysToSpan - 1);
        endLeaveDate.setHours(0, 0, 0, 0);
        const endTimestamp = endLeaveDate.getTime();

        if (
          todayTimestamp >= startTimestamp &&
          todayTimestamp <= endTimestamp
        ) {
          const isHalfDay = durationNum % 1 !== 0;

          if (isHalfDay && todayTimestamp === endTimestamp) {
            if (checkType === "checkIn") {
              return {
                blocked: true,
                reason: `ច្បាប់ ${durationStr} (ព្រឹក) (${reason})`,
              };
            } else {
              continue;
            }
          }
          return { blocked: true, reason: `ច្បាប់ ${durationStr} (${reason})` };
        }
      } else {
        if (startDateStr === todayString_DD_Mon_YYYY) {
          if (durationStr === "មួយថ្ងៃ" || durationStr === "មួយយប់") {
            return {
              blocked: true,
              reason: `ច្បាប់ ${durationStr} (${reason})`,
            };
          }
          if (durationStr === "មួយព្រឹក") {
            return { blocked: true, reason: `ច្បាប់មួយព្រឹក (${reason})` };
          }
          if (durationStr === "មួយរសៀល") {
            return { blocked: true, reason: `ច្បាប់មួយរសៀល (${reason})` };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking [leave_requests] status:", error);
    showMessage(
      "បញ្ហាពិនិត្យច្បាប់",
      `មិនអាចទាញទិន្នន័យច្បាប់ (leave_requests) បានទេ៖ ${error.message}`,
      true
    );
    return { blocked: true, reason: "Error checking leave status." };
  }
}

async function startFaceScan(action) {
  currentScanAction = action;

  if (!modelsLoaded) {
    showMessage(
      "បញ្ហា",
      "AI Models មិនទាន់ផ្ទុករួចរាល់។ សូមរង់ចាំបន្តិច។",
      true
    );
    return;
  }

  if (!currentUserFaceMatcher) {
    showMessage(
      "បញ្ហា",
      "មិនអាចស្កេនមុខបានទេ។ អាចមកពីមិនមានរូបថត Profile ឬរូបថតមិនច្បាស់។ សូមពិនិត្យប្រសិនអ្នកគ្មានរូបថត Profile នោះទេ​ សូមអ្នកមកជួបក្រុមការងារនៅអគារ B ដើម្បីបង្កើតគណនី ទើបអ្នកអាចប្រើប្រាស់សេវារដ្ឋបាលផ្សេងៗនៅ DI បាន។",
      true
    );
    return;
  }

  cameraLoadingText.textContent = "កំពុងស្នើសុំកាមេរ៉ា...";
  cameraHelpText.textContent = "សូមអនុញ្ញាតឱ្យប្រើប្រាស់កាមេរ៉ា";
  captureButton.style.display = "none";
  captureButton.disabled = false;
  cameraCanvas.style.display = "none";

  cameraModal.classList.remove("modal-hidden");
  cameraModal.classList.add("modal-visible");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    videoElement.srcObject = videoStream;

    videoElement.onplay = () => {
      cameraLoadingText.textContent = "ត្រៀមរួចរាល់";
      cameraHelpText.textContent = "សូមដាក់មុខឱ្យចំ រួចចុចប៊ូតុងថត";
      captureButton.style.display = "flex";
    };
  } catch (err) {
    console.error("Camera Error:", err);
    showMessage(
      "បញ្ហាកាមេរ៉ា",
      `មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាត (Allow)។ Error: ${err.message}`,
      true
    );
    hideCameraModal();
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = null;
  }
  videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  cameraModal.classList.add("modal-hidden");
  cameraModal.classList.remove("modal-visible");
  cameraCanvas
    .getContext("2d")
    .clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
}

async function handleCaptureAndAnalyze() {
  if (!videoStream) return;

  cameraLoadingText.textContent = "កំពុងវិភាគ...";
  cameraHelpText.textContent = "សូមរង់ចាំបន្តិច";
  captureButton.disabled = true;

  const displaySize = {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
  };
  faceapi.matchDimensions(cameraCanvas, displaySize);

  cameraCanvas
    .getContext("2d")
    .drawImage(videoElement, 0, 0, displaySize.width, displaySize.height);

  try {
    const detection = await faceapi
      .detectSingleFace(cameraCanvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      cameraLoadingText.textContent = "រកមិនឃើញផ្ទៃមុខ!";
      cameraHelpText.textContent = "សូមដាក់មុខឱ្យចំ រួចព្យាយាមម្តងទៀត។";
      captureButton.disabled = false;
      return;
    }

    const bestMatch = currentUserFaceMatcher.findBestMatch(
      detection.descriptor
    );
    const matchPercentage = Math.round((1 - bestMatch.distance) * 100);

    const resizedDetection = faceapi.resizeResults(detection, displaySize);
    faceapi.draw.drawDetections(cameraCanvas, resizedDetection);
    cameraCanvas.style.display = "block";

    if (
      bestMatch.label !== "unknown" &&
      bestMatch.distance < FACE_MATCH_THRESHOLD
    ) {
      cameraLoadingText.textContent = `ស្គាល់ជា: ${currentUser.name} (${matchPercentage}%)`;
      cameraHelpText.textContent = "កំពុងបន្តដំណើរការ...";

      setTimeout(() => {
        hideCameraModal();
        if (currentScanAction === "checkIn") {
          handleCheckIn();
        } else if (currentScanAction === "checkOut") {
          handleCheckOut();
        }
      }, 1000);
    } else {
      cameraLoadingText.textContent = `មិនត្រឹមត្រូវ... (${matchPercentage}%)`;
      cameraHelpText.textContent =
        "នេះមិនមែនជាគណនីរបស់អ្នកទេ។ សូមព្យាយាមម្តងទៀត។";
      captureButton.disabled = false;
    }
  } catch (e) {
    console.error("Analysis Error:", e);
    cameraLoadingText.textContent = "ការវិភាគមានបញ្ហា!";
    cameraHelpText.textContent = e.message;
    captureButton.disabled = false;
  }
}

// --- Main Functions ---

async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp);
    dbAttendanceRTDB = getDatabase(attendanceApp);

    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    console.log("Firebase Attendance App Initialized (Default)");
    console.log("Firebase Leave App Initialized (leaveApp)");

    setLogLevel("debug");
    await setupAuthListener();
  } catch (error) {
    console.error("Firebase Init Error:", error);
    showMessage(
      "បញ្ហាធ្ងន់ធ្ងរ",
      `មិនអាចភ្ជាប់ទៅ Firebase បានទេ: ${error.message}`,
      true
    );
  }
}

function fetchShiftRules() {
  if (!dbAttendanceRTDB) return;

  const rulesRef = ref(dbAttendanceRTDB, "វេនធ្វើការ");

  onValue(
    rulesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        allShiftRules = snapshot.val();
        console.log("Firebase Shift Rules Loaded:", allShiftRules);
        if (currentUser) {
          mergeAndRenderHistory();
        }
      } else {
        console.error("មិនអាចរកឃើញ 'វេនធ្វើការ' នៅក្នុង Realtime Database!");
        showMessage(
          "បញ្ហាកំណត់វេន",
          "មិនអាចទាញយកច្បាប់វេនការងារពី Firebase បានទេ។",
          true
        );
      }
    },
    (error) => {
      console.error("Firebase RTDB Error:", error);
      showMessage("បញ្ហា RTDB", `មិនអាចភ្ជាប់ RTDB បានទេ: ${error.message}`, true);
    }
  );
}

function fetchCheckInLateRules() {
  if (!dbAttendanceRTDB) return;

  const rulesRef = ref(dbAttendanceRTDB, "CheckInLate");

  onValue(
    rulesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        allCheckInLateRules = snapshot.val();
        console.log("Firebase CheckInLate Rules Loaded:", allCheckInLateRules);
      } else {
        console.error("មិនអាចរកឃើញ 'CheckInLate' នៅក្នុង Realtime Database!");
        console.warn("CheckInLate rules not found. Late check will not function.");
      }
    },
    (error) => {
      console.error("Firebase RTDB Error (CheckInLate):", error);
    }
  );
}

async function setupAuthListener() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(authAttendance, async (user) => {
      if (user) {
        console.log("Firebase Auth user signed in:", user.uid);
        
        try {
          await syncFirebaseTime();
          fetchShiftRules();
          fetchCheckInLateRules();
          await loadAIModels();
          resolve();
        } catch (error) {
          console.error("Failed to init app due to time sync error.");
          reject(error);
        }

      } else {
        try {
          await signInAnonymously(authAttendance);
        } catch (error) {
          console.error("Firebase Sign In Error:", error);
          showMessage(
            "បញ្ហា Sign In",
            `មិនអាច Sign In ទៅ Firebase បានទេ: ${error.message}`,
            true
          );
          reject(error);
        }
      }
    });
  });
}


async function fetchGoogleSheetData() {
  changeView("loadingView");
  loadingText.textContent = "កំពុងទាញបញ្ជីបុគ្គលិក...";

  try {
    const response = await fetch(GVIZ_URL);
    if (!response.ok) {
      throw new Error(`Network response was not ok (${response.status})`);
    }
    let text = await response.text();

    const jsonText = text.match(
      /google\.visualization\.Query\.setResponse\((.*)\);/s
    );
    if (!jsonText || !jsonText[1]) {
      throw new Error("Invalid Gviz response format.");
    }

    const data = JSON.parse(jsonText[1]);

    if (data.status === "error") {
      throw new Error(
        `Google Sheet Error: ${data.errors
          .map((e) => e.detailed_message)
          .join(", ")}`
      );
    }

    allEmployees = data.table.rows
      .map((row) => {
        const cells = row.c;
        const id = cells[COL_INDEX.ID]?.v;
        if (!id) {
          return null;
        }

        const photoLink = cells[COL_INDEX.PHOTO]?.v || null;

        return {
          id: String(id).trim(),
          name: cells[COL_INDEX.NAME]?.v || "N/A",
          department: cells[COL_INDEX.DEPT]?.v || "N/A",
          photoUrl: photoLink,
          group: cells[COL_INDEX.GROUP]?.v || "N/A",
          gender: cells[COL_INDEX.GENDER]?.v || "N/A",
          grade: cells[COL_INDEX.GRADE]?.v || "N/A",
          shiftMon: cells[COL_INDEX.SHIFT_MON]?.v || null,
          shiftTue: cells[COL_INDEX.SHIFT_TUE]?.v || null,
          shiftWed: cells[COL_INDEX.SHIFT_WED]?.v || null,
          shiftThu: cells[COL_INDEX.SHIFT_THU]?.v || null,
          shiftFri: cells[COL_INDEX.SHIFT_FRI]?.v || null,
          shiftSat: cells[COL_INDEX.SHIFT_SAT]?.v || null,
          shiftSun: cells[COL_INDEX.SHIFT_SUN]?.v || null,
        };
      })
      .filter((emp) => emp !== null)
      .filter((emp) => emp.group !== "ការងារក្រៅ")
      .filter((emp) => emp.group !== "បុគ្គលិក");

    console.log(`Loaded ${allEmployees.length} employees (Filtered).`);
    renderEmployeeList(allEmployees);

    const savedEmployeeId = localStorage.getItem("savedEmployeeId");
    if (savedEmployeeId) {
      const savedEmployee = allEmployees.find(
        (emp) => emp.id === savedEmployeeId
      );
      if (savedEmployee) {
        console.log("Logging in with saved user:", savedEmployee.name);
        selectUser(savedEmployee);
      } else {
        console.log("Saved user ID not found in list. Clearing storage.");
        localStorage.removeItem("savedEmployeeId");
        localStorage.removeItem("currentDeviceId");
        changeView("employeeListView");
      }
    } else {
      changeView("employeeListView");
    }
  } catch (error) {
    console.error("Fetch Google Sheet Error:", error);
    showMessage(
      "បញ្ហាទាញទិន្នន័យ",
      `មិនអាចទាញទិន្នន័យពី Google Sheet បានទេ។ សូមប្រាកដថា Sheet ត្រូវបាន Publish to the web។ Error: ${error.message}`,
      true
    );
  }
}

function renderEmployeeList(employees) {
  employeeListContainer.innerHTML = "";
  employeeListContainer.classList.remove("hidden");

  if (employees.length === 0) {
    employeeListContainer.innerHTML = `<p class="text-center text-gray-500 p-3">រកមិនឃើញបុគ្គលិក (IT Support) ទេ។</p>`;
    return;
  }

  employees.forEach((emp) => {
    const card = document.createElement("div");
    card.className =
      "flex items-center p-3 rounded-xl cursor-pointer hover:bg-blue-50 transition-all shadow-md mb-2 bg-white";
    card.innerHTML = `
              <img src="${
                emp.photoUrl ||
                "https://placehold.co/48x48/e2e8f0/64748b?text=No+Img"
              }" 
                  alt="រូបថត" 
                  class="w-12 h-12 rounded-full object-cover border-2 border-gray-100 mr-3"
                  onerror="this.src='https://placehold.co/48x48/e2e8f0/64748b?text=Error'">
              <div>
                  <h3 class="text-md font-semibold text-gray-800">${emp.name}</h3>
                  <p class="text-sm text-gray-500">ID: ${emp.id} | ក្រុម: ${
      emp.group
    }</p>
              </div>
          `;
    card.onmousedown = () => selectUser(emp);
    employeeListContainer.appendChild(card);
  });
}

// ស្វែងរក Function ឈ្មោះ "selectUser"
async function selectUser(employee) {
  console.log("User selected:", employee);

  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);

  try {
    const sessionDocRef = doc(sessionCollectionRef, employee.id);
    await setDoc(sessionDocRef, {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
    });
    console.log(
      `Session lock set for ${employee.id} with deviceId ${currentDeviceId}`
    );
  } catch (e) {
    console.error("Failed to set session lock:", e);
    showMessage(
      "បញ្ហា Session",
      `មិនអាចកំណត់ Session Lock បានទេ៖ ${e.message}`,
      true
    );
    return;
  }

  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);

  const dayOfWeek = getSyncedTime().getDay();
  const dayToShiftKey = [
    "shiftSun",
    "shiftMon",
    "shiftTue",
    "shiftWed",
    "shiftThu",
    "shiftFri",
    "shiftSat",
  ];
  const shiftKey = dayToShiftKey[dayOfWeek];
  currentUserShift = currentUser[shiftKey] || "N/A";
  console.log(`ថ្ងៃនេះ (Day ${dayOfWeek}), វេនគឺ: ${currentUserShift}`);

  const firestoreUserId = currentUser.id;
  const simpleDataPath = `attendance/${firestoreUserId}/records`;
  console.log("Using Firestore Path:", simpleDataPath);
  attendanceCollectionRef = collection(dbAttendance, simpleDataPath);

  welcomeMessage.textContent = `សូមស្វាគមន៍`;
  profileImage.src =
    employee.photoUrl || "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img";
  profileName.textContent = employee.name;
  profileId.textContent = `អត្តលេខ: ${employee.id}`;
  profileGender.textContent = `ភេទ: ${employee.gender}`;
  profileDepartment.textContent = `ផ្នែក: ${employee.department}`;
  profileGroup.textContent = `ក្រុម: ${employee.group}`;
  profileGrade.textContent = `ថ្នាក់: ${employee.grade}`;
  profileShift.textContent = `វេនថ្ងៃនេះ: ${currentUserShift}`;

  changeView("homeView");

  // --- *** កំណែកែប្រែ *** ---
  // 1. ត្រូវប្រាកដថាយើងទាញទិន្នន័យច្បាប់ដំបូង (Initial Leave) ជាមុនសិន
  //    Function នេះនឹងហៅ mergeAndRenderHistory() លើកទីមួយ។
  await startLeaveListeners();

  // 2. បន្ទាប់មក ចាប់ផ្ដើម Listener សម្រាប់វត្តមាន។
  //    វានឹងហៅ mergeAndRenderHistory() លើកទីពីរ ដោយមានទិន្នន័យច្បាប់រួចជាស្រេច
  setupAttendanceListener();
  startSessionListener(employee.id);
  // --- *** ចប់កំណែកែប្រែ *** ---

  if (timeCheckInterval) clearInterval(timeCheckInterval);
  timeCheckInterval = setInterval(updateButtonState, 30000);

  prepareFaceMatcher(employee.photoUrl);

  employeeListContainer.classList.add("hidden");
  searchInput.value = "";
}

function logout() {
  currentUser = null;
  currentUserShift = null;
  currentUserFaceMatcher = null;

  localStorage.removeItem("savedEmployeeId");
  localStorage.removeItem("currentDeviceId");
  currentDeviceId = null;

  if (attendanceListener) {
    attendanceListener();
    attendanceListener = null;
  }

  if (sessionListener) {
    sessionListener();
    sessionListener = null;
  }

  if (leaveCollectionListener) {
    leaveCollectionListener();
    leaveCollectionListener = null;
  }
  if (outCollectionListener) {
    outCollectionListener();
    outCollectionListener = null;
  }

  if (timeCheckInterval) {
    clearInterval(timeCheckInterval);
    timeCheckInterval = null;
  }

  attendanceCollectionRef = null;
  currentMonthRecords = [];
  attendanceRecords = [];
  leaveRecords = [];

  if (historyContainer) {
    historyContainer.innerHTML = "";
    if (noHistoryRow) {
      noHistoryRow.textContent = "មិនទាន់មានទិន្នន័យថ្ងៃនេះ";
      historyContainer.appendChild(noHistoryRow);
    }
  }

  if (monthlyHistoryContainer) {
    monthlyHistoryContainer.innerHTML = "";
    if (noMonthlyHistoryRow) {
      noMonthlyHistoryRow.textContent = "មិនទាន់មានទិន្នន័យ";
      monthlyHistoryContainer.appendChild(noMonthlyHistoryRow);
    }
  }

  searchInput.value = "";
  employeeListContainer.classList.add("hidden");

  changeView("employeeListView");
}

function startSessionListener(employeeId) {
  if (sessionListener) {
    sessionListener();
  }

  const sessionDocRef = doc(sessionCollectionRef, employeeId);

  sessionListener = onSnapshot(
    sessionDocRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        console.warn("Session document deleted. Logging out.");
        forceLogout("Session របស់អ្នកត្រូវបានបញ្ចប់។");
        return;
      }

      const sessionData = docSnap.data();
      const firestoreDeviceId = sessionData.deviceId;

      const localDeviceId = localStorage.getItem("currentDeviceId");

      if (localDeviceId && firestoreDeviceId !== localDeviceId) {
        console.warn("Session conflict detected. Logging out.");
        forceLogout("គណនីនេះត្រូវបានចូលប្រើនៅឧបករណ៍ផ្សេង។");
      }
    },
    (error) => {
      console.error("Error in session listener:", error);
      forceLogout("មានបញ្ហាក្នុងការតភ្ជាប់ Session។");
    }
  );
}

function forceLogout(message) {
  logout();

  modalTitle.textContent = "បានចាកចេញដោយស្វ័យប្រវត្តិ";
  modalMessage.textContent = message;
  modalTitle.classList.remove("text-gray-800");
  modalTitle.classList.add("text-red-600");

  modalConfirmButton.textContent = "យល់ព្រម";
  modalConfirmButton.className =
    "w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 col-span-2";
  modalCancelButton.style.display = "none";

  currentConfirmCallback = () => {
    hideMessage();
    changeView("employeeListView");
  };

  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

// ស្វែងរក Function ឈ្មោះ "startLeaveListeners"
async function startLeaveListeners() { // បន្ថែម "async"
  if (!dbLeave || !currentUser) return;

  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  const leaveCollectionPath =
    "/artifacts/default-app-id/public/data/leave_requests";
  const outCollectionPath =
    "/artifacts/default-app-id/public/data/out_requests";

  const employeeId = currentUser.id;

  const reFetchAllLeave = async () => {
    leaveRecords = await fetchAllLeaveForMonth(employeeId);
    console.log(`Real-time Leave Updated: ${leaveRecords.length} records.`);
    await mergeAndRenderHistory();
  };

  // --- *** កំណែកែប្រែ *** ---
  // 1. ហៅ Function នេះភ្លាមៗ ដើម្បីទាញទិន្នន័យច្បាប់ដំបូង (Initial Fetch)
  await reFetchAllLeave();
  // --- *** ចប់កំណែកែប្រែ *** ---

  // 2. បន្ទាប់មក បង្កើត Listeners សម្រាប់តាមដានការផ្លាស់ប្តូរនាពេលអនាគត
  const qLeave = query(
    collection(dbLeave, leaveCollectionPath),
    where("userId", "==", employeeId)
  );
  leaveCollectionListener = onSnapshot(
    qLeave,
    (snapshot) => {
      console.log("Real-time update from 'leave_requests' detected.");
      reFetchAllLeave();
    },
    (error) => {
      console.error("Error listening to 'leave_requests':", error);
      showMessage(
        "បញ្ហា",
        "មិនអាចស្តាប់ទិន្នន័យច្បាប់ (Leave) បានទេ។",
        true
      );
    }
  );

  const qOut = query(
    collection(dbLeave, outCollectionPath),
    where("userId", "==", employeeId)
  );
  outCollectionListener = onSnapshot(
    qOut,
    (snapshot) => {
      console.log("Real-time update from 'out_requests' detected.");
      reFetchAllLeave();
    },
    (error) => {
      console.error("Error listening to 'out_requests':", error);
      showMessage("បញ្ហា", "មិនអាចស្តាប់ទិន្នន័យច្បាប់ (Out) បានទេ។", true);
    }
  );
}

// --- *** កែប្រែ: ត្រឡប់ទៅប្រើទិន្នន័យពី querySnapshot ផ្ទាល់ វិញ (FIX) *** ---
function setupAttendanceListener() {
  if (!attendanceCollectionRef) return;

  if (attendanceListener) {
    attendanceListener(); // បញ្ឈប់ Listener ចាស់
  }

  checkInButton.disabled = true;
  checkOutButton.disabled = true;
  attendanceStatus.textContent = "កំពុងទាញប្រវត្តិវត្តមាន...";
  attendanceStatus.className =
    "text-center text-sm text-gray-500 pb-4 px-6 h-5 animate-pulse";

  attendanceListener = onSnapshot(
    attendanceCollectionRef,
    async (querySnapshot) => { // ប្រើ async សម្រាប់ await mergeAndRenderHistory
      console.log("Real-time update from 'attendance' detected.");
      let allRecords = [];
      querySnapshot.forEach((doc) => { // ប្រើទិន្នន័យផ្ទាល់ពី snapshot
        allRecords.push(doc.data());
      });

      const { startOfMonth, endOfMonth } = getCurrentMonthRange();

      // 1. Update the global attendanceRecords ពីទិន្នន័យ Snapshot ផ្ទាល់
      attendanceRecords = allRecords.filter(
        (record) => record.date >= startOfMonth && record.date <= endOfMonth
      );

      console.log(
        `Real-time Attendance Updated: ${attendanceRecords.length} records.`
      );

      // 2. ហៅ merge and render function
      await mergeAndRenderHistory();
    },
    (error) => {
      console.error("Error listening to attendance:", error);
      showMessage("បញ្ហា", "មិនអាចស្តាប់ទិន្នន័យវត្តមានបានទេ។", true);
      attendanceStatus.textContent = "Error";
      attendanceStatus.className =
        "text-center text-sm text-red-500 pb-4 px-6 h-5";
    }
  );
}


function renderMonthlyHistory() {
  const container = document.getElementById("monthlyHistoryContainer");
  const noDataRow = document.getElementById("noMonthlyHistoryRow");
  if (!container || !noDataRow) return;
  
  container.innerHTML = "";

  if (currentMonthRecords.length === 0) {
    container.appendChild(noDataRow);
    return;
  }

  const todayString = getTodayDateString();

  currentMonthRecords.forEach((record) => {
    const formattedDate = record.formattedDate || record.date;
    const isToday = record.date === todayString;

    let checkInDisplay;
    if (record.checkIn) {
      if (record.checkIn.includes("AM") || record.checkIn.includes("PM")) {
        if (record.checkIn.includes("(មកយឺត)")) {
          checkInDisplay = `<span class="text-red-500 font-semibold">${record.checkIn}</span>`;
        } else {
          checkInDisplay = `<span class="text-green-600 font-semibold">${record.checkIn}</span>`;
        }
      } else {
        checkInDisplay = `<span class="text-blue-600 font-semibold">${record.checkIn}</span>`;
      }
    } else {
      checkInDisplay = isToday
        ? "---"
        : '<span class="text-red-500 font-semibold">អវត្តមាន</span>';
    }

    let checkOutDisplay;
    if (record.checkOut) {
      if (record.checkOut.includes("AM") || record.checkOut.includes("PM")) {
        checkOutDisplay = `<span class="text-red-600 font-semibold">${record.checkOut}</span>`;
      } else {
        checkOutDisplay = `<span class="text-blue-600 font-semibold">${record.checkOut}</span>`;
      }
    } else {
      checkOutDisplay = isToday
        ? '<span class="text-gray-400">មិនទាន់ចេញ</span>'
        : '<span class="text-red-500 font-semibold">អវត្តមាន</span>';
    }

    const isCheckInShort = isShortData(checkInDisplay);
    const isCheckOutShort = isShortData(checkOutDisplay);

    const useCompactLayout = isCheckInShort && isCheckOutShort;

    const card = document.createElement("div");
    card.className = "bg-white p-4 rounded-lg shadow-sm border border-gray-100";

    let contentHTML = "";

    if (useCompactLayout) {
      contentHTML = `
        <p class="text-sm font-semibold text-gray-800 mb-2">${formattedDate}</p>
        <div class="grid grid-cols-2 gap-2">
          <div class="text-sm">
            <span class="text-gray-500">ចូល:</span> ${checkInDisplay}
          </div>
          <div class="text-sm">
            <span class="text-gray-500">ចេញ:</span> ${checkOutDisplay}
          </div>
        </div>
      `;
    } else {
      contentHTML = `
        <p class="text-sm font-semibold text-gray-800 mb-3">${formattedDate}</p>
        <div class="flex flex-col space-y-2 text-sm">
          <div>
            <span class="text-gray-500 block text-xs">ចូល:</span>
            ${checkInDisplay}
          </div>
          <div>
            <span class="text-gray-500 block text-xs">ចេញ:</span>
            ${checkOutDisplay}
          </div>
        </div>
      `;

      if (
        record.checkIn &&
        record.checkOut &&
        record.checkIn === record.checkOut &&
        !isCheckInShort
      ) {
        contentHTML = `
          <p class="text-sm font-semibold text-gray-800 mb-2">${formattedDate}</p>
          <div class="text-sm">
            ${checkInDisplay} 
          </div>
        `;
      }
    }

    card.innerHTML = contentHTML;
    container.appendChild(card);
  });
}

function renderTodayHistory() {
  const container = document.getElementById("historyContainer");
  const noDataRow = document.getElementById("noHistoryRow");
  if (!container || !noDataRow) return;

  container.innerHTML = "";

  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find(
    (record) => record.date === todayString
  );

  if (!todayRecord) {
    container.appendChild(noDataRow);
    return;
  }

  const formattedDate = todayRecord.formattedDate || todayRecord.date;

  let checkInDisplay;
  if (todayRecord.checkIn) {
    if (
      todayRecord.checkIn.includes("AM") ||
      todayRecord.checkIn.includes("PM")
    ) {
      if (todayRecord.checkIn.includes("(មកយឺត)")) {
          checkInDisplay = `<span class="text-red-500 font-semibold">${todayRecord.checkIn}</span>`;
        } else {
          checkInDisplay = `<span class="text-green-600 font-semibold">${todayRecord.checkIn}</span>`;
        }
    } else {
      checkInDisplay = `<span class="text-blue-600 font-semibold">${todayRecord.checkIn}</span>`;
    }
  } else {
    checkInDisplay = "---";
  }

  let checkOutDisplay;
  if (todayRecord.checkOut) {
    if (
      todayRecord.checkOut.includes("AM") ||
      todayRecord.checkOut.includes("PM")
    ) {
      checkOutDisplay = `<span class="text-red-600 font-semibold">${todayRecord.checkOut}</span>`;
    } else {
      checkOutDisplay = `<span class="text-blue-600 font-semibold">${todayRecord.checkOut}</span>`;
    }
  } else {
    checkOutDisplay = '<span class="text-gray-400">មិនទាន់ចេញ</span>';
  }

  const isCheckInShort = isShortData(checkInDisplay);
  const isCheckOutShort = isShortData(checkOutDisplay);

  const useCompactLayout = isCheckInShort && isCheckOutShort;

  const card = document.createElement("div");
  card.className =
    "bg-blue-50 p-4 rounded-lg shadow border border-blue-200";

  let contentHTML = "";

  if (useCompactLayout) {
    contentHTML = `
      <p class="text-sm font-semibold text-blue-800 mb-2">${formattedDate}</p>
      <div class="grid grid-cols-2 gap-2">
        <div class="text-sm">
          <span class="text-blue-700">ចូល:</span> ${checkInDisplay}
        </div>
        <div class="text-sm">
          <span class="text-blue-700">ចេញ:</span> ${checkOutDisplay}
        </div>
      </div>
    `;
  } else {
    contentHTML = `
      <p class="text-sm font-semibold text-blue-800 mb-3">${formattedDate}</p>
      <div class="flex flex-col space-y-2 text-sm">
        <div>
          <span class="text-blue-700 block text-xs">ចូល:</span>
          ${checkInDisplay}
        </div>
        <div>
          <span class="text-blue-700 block text-xs">ចេញ:</span>
          ${checkOutDisplay}
        </div>
      </div>
    `;

    if (
      todayRecord.checkIn &&
      todayRecord.checkOut &&
      todayRecord.checkIn === todayRecord.checkOut &&
      !isCheckInShort
    ) {
      contentHTML = `
        <p class="text-sm font-semibold text-blue-800 mb-2">${formattedDate}</p>
        <div class="text-sm">
          ${checkInDisplay} 
        </div>
      `;
    }
  }

  card.innerHTML = contentHTML;
  container.appendChild(card);
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find(
    (record) => record.date === todayString
  );

  const outOfOfficeInStatus = await checkLeaveStatus(currentUser.id, "checkIn");
  const fullLeaveInStatus = await checkFullLeaveStatus(currentUser.id, "checkIn");
  const leaveBlockIn = outOfOfficeInStatus || fullLeaveInStatus;
  
  const outOfOfficeOutStatus = await checkLeaveStatus(currentUser.id, "checkOut");
  const fullLeaveOutStatus = await checkFullLeaveStatus(currentUser.id, "checkOut");
  const leaveBlockOut = outOfOfficeOutStatus || fullLeaveOutStatus;

  const canCheckIn = checkShiftTime(currentUserShift, "checkIn");
  const canCheckOut = checkShiftTime(currentUserShift, "checkOut");

  let checkInDisabled = false;
  let statusMessage = "សូមធ្វើការ Check-in";
  let statusClass = "text-blue-700";

  if (todayData && todayData.checkIn) {
    checkInDisabled = true;
    if (todayData.checkIn.includes("(មកយឺត)")) {
      statusMessage = `បាន Check-in ម៉ោង: ${todayData.checkIn}`;
      statusClass = "text-red-700";
    } else if (isShortData(`<span class="${statusClass}">${todayData.checkIn}</span>`)) {
      statusMessage = `បាន Check-in ម៉ោង: ${todayData.checkIn}`;
      statusClass = "text-green-700";
    } else {
      statusMessage = `ថ្ងៃនេះអ្នកមាន៖ ${todayData.checkIn}`;
      statusClass = "text-blue-700";
    }
  } else if (leaveBlockIn) {
    checkInDisabled = true;
    statusMessage = `អ្នកបានសុំច្បាប់៖ ${leaveBlockIn.reason}`;
    statusClass = "text-red-700";
  } else if (!canCheckIn) {
    checkInDisabled = true;
    statusMessage = `ក្រៅម៉ោង Check-in (${currentUserShift})`;
    statusClass = "text-yellow-600";
  }

  checkInButton.disabled = checkInDisabled;

  let checkOutDisabled = true;

  if (todayData && todayData.checkIn && !todayData.checkOut) {
    checkOutDisabled = false;

    if (leaveBlockOut) {
      checkOutDisabled = true;
      statusMessage = `អ្នកបានសុំច្បាប់៖ ${leaveBlockOut.reason}`;
      statusClass = "text-red-700";
    } else if (!canCheckOut) {
      checkOutDisabled = true;
      statusMessage = `ក្រៅម៉ោង Check-out (${currentUserShift})`;
      statusClass = "text-yellow-600";
    }
    
    if (isShortData(`<span class="${statusClass}">${todayData.checkIn}</span>`)) {
        if (checkOutDisabled) {
          // Keep the 'leave' or 'outside shift' message
        } else if (todayData.checkIn.includes("(មកយឺត)")) {
            statusMessage = `បាន Check-in ម៉ោង: ${todayData.checkIn}`;
            statusClass = "text-red-700";
        } else {
          statusMessage = `បាន Check-in ម៉ោង: ${todayData.checkIn}`;
          statusClass = "text-green-700";
        }
    }

  } else if (todayData && todayData.checkOut) {
    checkOutDisabled = true;
    if (isShortData(`<span class="${statusClass}">${todayData.checkOut}</span>`)) {
      statusMessage = `បាន Check-out ម៉ោង: ${todayData.checkOut}`;
      statusClass = "text-red-700";
    } else {
      statusMessage = `ថ្ងៃនេះអ្នកមាន៖ ${todayData.checkOut}`;
      statusClass = "text-blue-700";
    }
  }
  
  checkOutButton.disabled = checkOutDisabled;

  attendanceStatus.textContent = statusMessage;
  attendanceStatus.className = `text-center text-sm pb-4 px-6 h-5 ${statusClass}`;
}


async function handleCheckIn() {
  if (!attendanceCollectionRef || !currentUser) return;

  checkInButton.disabled = true;
  checkOutButton.disabled = true;
  attendanceStatus.textContent = "កំពុងពិនិត្យទីតាំង...";
  attendanceStatus.classList.add("animate-pulse");

  let userCoords;
  try {
    userCoords = await getUserLocation();
    console.log("User location:", userCoords.latitude, userCoords.longitude);

    if (!isInsideArea(userCoords.latitude, userCoords.longitude)) {
      showMessage(
        "បញ្ហាទីតាំង",
        "អ្នកមិនស្ថិតនៅក្នុងទីតាំងកំណត់ទេ។ សូមចូលទៅក្នុងតំបន់ការិយាល័យ រួចព្យាយាមម្តងទៀត។",
        true
      );
      attendanceStatus.classList.remove("animate-pulse");
      attendanceStatus.textContent = "បរាជ័យ (ក្រៅទីតាំង)";
      attendanceStatus.className =
        "text-center text-sm text-red-700 pb-4 px-6 h-5";
      await updateButtonState();
      return;
    }

    console.log("User is INSIDE the area.");
  } catch (error) {
    console.error("Location Error:", error.message);
    showMessage("បញ្ហាទីតាំង", error.message, true);
    await updateButtonState();
    attendanceStatus.classList.remove("animate-pulse");
    return;
  }

  attendanceStatus.textContent = "កំពុងដំណើរការ Check-in...";

  const now = getSyncedTime();
  const todayDocId = getTodayDateString(now);

  let checkInString = formatTime(now);
  
  if (allCheckInLateRules && allCheckInLateRules[currentUserShift]) {
    const lateRuleString = allCheckInLateRules[currentUserShift].Uptime;
    
    if (lateRuleString) {
      const lateThresholdTime = convertTimeFormat(lateRuleString);
      const currentTime = now.getHours() + now.getMinutes() / 60;
      
      if (lateThresholdTime !== null && currentTime >= lateThresholdTime) {
        checkInString += " (មកយឺត)";
        console.log("Check-in LATE detected!");
      }
    }
  }

  const data = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    department: currentUser.department,
    group: currentUser.group,
    grade: currentUser.grade,
    gender: currentUser.gender,
    shift: currentUserShift,
    date: todayDocId,
    checkInTimestamp: now.toISOString(),
    checkOutTimestamp: null,
    formattedDate: formatDate(now),
    checkIn: checkInString,
    checkOut: null,
    checkInLocation: { lat: userCoords.latitude, lon: userCoords.longitude },
  };

  try {
    const todayDocRef = doc(attendanceCollectionRef, todayDocId);
    await setDoc(todayDocRef, data);
  } catch (error) {
    console.error("Check In Error:", error);
    showMessage("បញ្ហា", `មិនអាច Check-in បានទេ: ${error.message}`, true);
    await updateButtonState();
  } finally {
    attendanceStatus.classList.remove("animate-pulse");
  }
}

async function handleCheckOut() {
  if (!attendanceCollectionRef) return;

  checkInButton.disabled = true;
  checkOutButton.disabled = true;
  attendanceStatus.textContent = "កំពុងពិនិត្យទីតាំង...";
  attendanceStatus.classList.add("animate-pulse");

  let userCoords;
  try {
    userCoords = await getUserLocation();
    console.log("User location:", userCoords.latitude, userCoords.longitude);

    if (!isInsideArea(userCoords.latitude, userCoords.longitude)) {
      showMessage(
        "បញ្ហាទីតាំង",
        "អ្នកមិនស្ថិតនៅក្នុងទីតាំងកំណត់ទេ។ សូមចូលទៅក្នុងតំបន់ការិយាល័យ រួចព្យាយាមម្តងទៀត។",
        true
      );
      attendanceStatus.classList.remove("animate-pulse");
      attendanceStatus.textContent = "បរាជ័យ (ក្រៅទីតាំង)";
      attendanceStatus.className =
        "text-center text-sm text-red-700 pb-4 px-6 h-5";
      await updateButtonState();
      return;
    }

    console.log("User is INSIDE the area.");
  } catch (error) {
    console.error("Location Error:", error.message);
    showMessage("បញ្ហាទីតាំង", error.message, true);
    await updateButtonState();
    attendanceStatus.classList.remove("animate-pulse");
    return;
  }

  attendanceStatus.textContent = "កំពុងដំណើរការ Check-out...";

  const now = getSyncedTime();
  const todayDocId = getTodayDateString(now);

  const data = {
    checkOutTimestamp: now.toISOString(),
    checkOut: formatTime(now),
    checkOutLocation: { lat: userCoords.latitude, lon: userCoords.longitude },
  };

  try {
    const todayDocRef = doc(attendanceCollectionRef, todayDocId);
    await updateDoc(todayDocRef, data);
  } catch (error) {
    console.error("Check Out Error:", error);
    showMessage("បញ្ហា", `មិនអាច Check-out បានទេ: ${error.message}`, true);
    await updateButtonState();
  } finally {
    attendanceStatus.classList.remove("animate-pulse");
  }
}

function formatTime(date) {
  if (!date) return null;
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${strHours}:${minutes} ${ampm}`;
}

// --- Event Listeners ---

searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredEmployees = allEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm) ||
      emp.id.toLowerCase().includes(searchTerm)
  );
  renderEmployeeList(filteredEmployees);
});

searchInput.addEventListener("focus", () => {
  employeeListHeader.style.display = "none";
  employeeListHelpText.style.display = "none";
  employeeListContent.style.paddingTop = "1.5rem";
  renderEmployeeList(allEmployees);
});

searchInput.addEventListener("blur", () => {
  setTimeout(() => {
    employeeListHeader.style.display = "flex";
    employeeListHelpText.style.display = "block";
    employeeListContent.style.paddingTop = "";
    employeeListContainer.classList.add("hidden");
  }, 200);
});

logoutButton.addEventListener("click", () => {
  showConfirmation(
    "ចាកចេញ",
    "តើអ្នកប្រាកដជាចង់ចាកចេញមែនទេ? គណនីរបស់អ្នកនឹងមិនត្រូវបានចងចាំទៀតទេ។",
    "ចាកចេញ",
    () => {
      logout();
      hideMessage();
    }
  );
});

exitAppButton.addEventListener("click", () => {
  showConfirmation(
    "បិទកម្មវិធី",
    "តើអ្នកប្រាកដជាចង់បិទកម្មវិធីមែនទេ?",
    "បិទកម្មវិធី",
    () => {
      window.close();
      hideMessage();
    }
  );
});

checkInButton.addEventListener("click", () => startFaceScan("checkIn"));
checkOutButton.addEventListener("click", () => startFaceScan("checkOut"));

modalCancelButton.addEventListener("click", hideMessage);
modalConfirmButton.addEventListener("click", () => {
  if (currentConfirmCallback) {
    currentConfirmCallback();
  } else {
    hideMessage();
  }
});

cameraCloseButton.addEventListener("click", hideCameraModal);
captureButton.addEventListener("click", handleCaptureAndAnalyze);

navHomeButton.addEventListener("click", () => {
  changeView("homeView");
  navHomeButton.classList.add("active-nav");
  navHistoryButton.classList.remove("active-nav");
});

navHistoryButton.addEventListener("click", () => {
  changeView("historyView");
  navHomeButton.classList.remove("active-nav");
  navHistoryButton.classList.add("active-nav");
});

// --- Initial Call ---
document.addEventListener("DOMContentLoaded", () => {
  initializeAppFirebase();
});
