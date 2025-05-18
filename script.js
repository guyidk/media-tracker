const DB_NAME = "mediaTrackerDB";
const DB_VERSION = 1;
const STORE_NAME = "media";

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Error opening IndexedDB");
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function addMedia(item) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.add(item);
  await tx.complete;
  renderList();
}

async function getAllMedia() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to fetch data");
  });
}

async function deleteMedia(id) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);
  await tx.complete;
  renderList();
}

async function clearAllMedia() {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  await tx.complete;
}

async function renderList() {
  const list = document.getElementById("media-list");
  const data = await getAllMedia();

  list.innerHTML = "";
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "media-item";
    div.innerHTML = `
      <strong>${item.title}</strong> (${item.type}) - ${item.status}
      <button onclick="deleteMedia(${item.id})">❌ Delete</button>
    `;
    list.appendChild(div);
  });
}

document.getElementById("media-form").onsubmit = async (e) => {
  e.preventDefault();
  const title = e.target.title.value.trim();
  const type = e.target.type.value.trim();
  const status = e.target.status.value.trim();

  if (title && type && status) {
    await addMedia({ title, type, status });
    e.target.reset();
  }
};

async function exportData() {
  const data = await getAllMedia();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "media-tracker-data.json";
  a.click();
}

async function importData() {
  const file = document.getElementById("import-file").files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        await clearAllMedia();
        for (let item of imported) {
          delete item.id; // Let IndexedDB assign new IDs
          await addMedia(item);
        }
      } else {
        alert("Invalid file format.");
      }
    } catch {
      alert("Failed to import data.");
    }
  };
  reader.readAsText(file);
}

// Initialize DB and render list
openDB().then(renderList);