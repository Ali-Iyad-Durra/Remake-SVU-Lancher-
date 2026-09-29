/* ============================================================
   SVU Live Sessions Launcher — Vanilla JS
   Handles: login modal, mock data, filtering, row selection,
   stats, clock and toast notifications.
============================================================ */
"use strict";

/* ---------- Mock lecture data ----------
   status: "live" (جارية الآن) | "soon" (لم تبدأ) | "done" (منتهية) */
const LECTURES = [
  {
    id: 1,
    program: "informatics",
    subject: "cpp",
    time: "08:30 - 10:00",
    name: "برمجة C++ — المؤشرات والذاكرة",
    status: "live",
    startedAt: "08:32",
    teacher: "د. سامر الحلبي",
  },
  {
    id: 2,
    program: "informatics",
    subject: "db",
    time: "10:15 - 11:45",
    name: "قواعد البيانات — التطبيعNormalization",
    status: "live",
    startedAt: "10:16",
    teacher: "د. راغد مخلوف",
  },
  {
    id: 3,
    program: "it",
    subject: "net",
    time: "12:00 - 13:30",
    name: "شبكات الحاسوب — بروتوكول TCP/IP",
    status: "soon",
    startedAt: "—",
    teacher: "د. فراس دياب",
  },
  {
    id: 4,
    program: "it",
    subject: "se",
    time: "14:00 - 15:30",
    name: "هندسة برمجيات — نماذج دورة الحياة",
    status: "soon",
    startedAt: "—",
    teacher: "د. لينا عمران",
  },
  {
    id: 5,
    program: "informatics",
    subject: "math",
    time: "16:00 - 17:30",
    name: "الرياضيات المتقطعة — نظرية المجموعات",
    status: "soon",
    startedAt: "—",
    teacher: "د. هيثم شاهين",
  },
  {
    id: 6,
    program: "business",
    subject: "se",
    time: "07:00 - 08:30",
    name: "هندسة برمجيات — إدارة المشاريع",
    status: "done",
    startedAt: "07:01",
    teacher: "د. غسان مرعي",
  },
  {
    id: 7,
    program: "it",
    subject: "db",
    time: "09:00 - 10:30",
    name: "قواعد البيانات — استعلامات SQL المتقدمة",
    status: "done",
    startedAt: "09:02",
    teacher: "د. راغد مخلوف",
  },
  {
    id: 8,
    program: "business",
    subject: "math",
    time: "11:00 - 12:30",
    name: "الرياضيات المتقطعة — المنطق والبراهين",
    status: "done",
    startedAt: "11:00",
    teacher: "د. هيثم شاهين",
  },
];

/* ---------- Status metadata (badge text/class) ---------- */
const STATUS = {
  live: { text: "جارية الآن", cls: "live" },
  soon: { text: "لم تبدأ", cls: "soon" },
  done: { text: "منتهية", cls: "done" },
};

/* ---------- Shortcuts ---------- */
const $ = (sel) => document.querySelector(sel);
const tableBody = $("#tableBody");
const programFilter = $("#programFilter");
const subjectFilter = $("#subjectFilter");
const playBtn = $("#playBtn");
const toast = $("#toast");
let selectedId = null;
let toastTimer = null;

/* ============================================================
   1) LOGIN MODAL
============================================================ */
const backdrop = $("#loginBackdrop");
const loginForm = $("#loginForm");
const loginError = $("#loginError");

// Show password toggle
$("#eyeToggle").addEventListener("click", () => {
  const pass = $("#password");
  const show = pass.type === "password";
  pass.type = show ? "text" : "password";
  $("#eyeToggle i").className = show
    ? "fa-solid fa-eye-slash"
    : "fa-solid fa-eye";
});

// Submit → validate → dismiss with smooth animation
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = $("#username").value.trim();
  const pass = $("#password").value.trim();

  if (!user || !pass) {
    loginError.classList.add("show");
    return;
  }

  // Personalize the dashboard with the username
  $("#displayName").textContent = user;
  $("#avatar").textContent = user.charAt(0).toUpperCase();

  // Smooth dismissal then reveal dashboard
  backdrop.classList.add("closing");
  setTimeout(() => {
    backdrop.style.display = "none";
    $("#dashboard").classList.remove("hidden");
    renderTable(); // initial render
    showToast("تم تسجيل الدخول بنجاح، أهلاً بك 👋");
  }, 450);
});

// Cancel button → simple feedback (keeps modal open in demo mode)
$("#cancelLogin").addEventListener("click", () => {
  loginForm.reset();
  loginError.classList.remove("show");
});

/* ============================================================
   2) TABLE RENDERING + FILTERING
============================================================ */
function getFilteredLectures() {
  const p = programFilter.value;
  const s = subjectFilter.value;
  return LECTURES.filter(
    (l) => (!p || l.program === p) && (!s || l.subject === s),
  );
}

function renderTable() {
  const rows = getFilteredLectures();

  // Build rows in one pass (better performance than appending one by one)
  tableBody.innerHTML = rows
    .map((l) => {
      const st = STATUS[l.status];
      return `
      <tr data-id="${l.id}" class="${l.id === selectedId ? "selected" : ""}">
        <td><span class="time">${l.time}</span></td>
        <td><span class="lecture-name"><i class="fa-solid fa-display"></i>${l.name}</span></td>
        <td><span class="badge ${st.cls}"><span class="dot"></span>${st.text}</span></td>
        <td><span class="time">${l.startedAt}</span></td>
        <td>${l.teacher}</td>
      </tr>`;
    })
    .join("");

  // Empty state
  if (!rows.length) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">لا توجد محاضرات مطابقة للفلاتر المحددة</td></tr>`;
  }

  updateStats(rows);
}

// Row click → highlight selection + enable Play button
tableBody.addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (!tr) return;

  selectedId = Number(tr.dataset.id);
  // Update selection highlight
  tableBody
    .querySelectorAll("tr")
    .forEach((r) => r.classList.toggle("selected", r === tr));

  const lec = LECTURES.find((l) => l.id === selectedId);
  playBtn.disabled = lec.status !== "live"; // only live lectures can play
  showToast(`تم اختيار: ${lec.name}`);
});

// "تنفيذ" button re-applies the filters
$("#executeBtn").addEventListener("click", () => {
  renderTable();
  showToast("تم تطبيق الفلاتر");
});

/* ============================================================
   3) STATS + FOOTER COUNTER
============================================================ */
function updateStats(rows) {
  const count = (s) => rows.filter((l) => l.status === s).length;
  $("#statLive").textContent = count("live");
  $("#statSoon").textContent = count("soon");
  $("#statDone").textContent = count("done");
  $("#lecturesCount").textContent = `عدد المحاضرات: ${rows.length}`;
  $("#footerLive").textContent = LECTURES.filter(
    (l) => l.status === "live",
  ).length;
}

/* ============================================================
   4) PLAY BUTTON
============================================================ */
playBtn.addEventListener("click", () => {
  const lec = LECTURES.find((l) => l.id === selectedId);
  if (lec) showToast(`جارٍ تشغيل: ${lec.name} ▶`);
});

/* ============================================================
   5) TOAST HELPER
============================================================ */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ============================================================
   6) LIVE CLOCK (sidebar footer)
============================================================ */
function tick() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
setInterval(tick, 1000);
tick();

/* ============================================================
   7) OTHER SIDEBAR ACTIONS (demo feedback)
============================================================ */
document
  .querySelectorAll(".btn-warn, .btn-danger")
  .forEach((btn) =>
    btn.addEventListener("click", () =>
      showToast(
        btn.classList.contains("btn-warn")
          ? "تم تسجيل الخروج"
          : "إغلاق التطبيق...",
      ),
    ),
  );
document
  .querySelector(".btn-outline .fa-rotate-right")
  ?.closest("button")
  .addEventListener("click", () => {
    renderTable();
    showToast("تم تحديث القائمة");
  });
