/*********************************
 * Variables globales para los filtros
 *********************************/
let selectedDate = null;
let selectedCompetition = null;
let selectedGender = null;

/*********************************
 * Set para almacenar fechas con partidos
 *********************************/
let matchDatesSet = new Set();

/*********************************
 * Set para almacenar competiciones detectadas
 *********************************/
let competitionSet = new Set();

/*********************************
 * 1) OBTENER LA LISTA DE ARCHIVOS JSON DESDE GITHUB
 *********************************/
async function fetchMatchFiles() {
  const apiUrl = "https://api.github.com/repos/emebullon/junior2025/contents/"; // Ajusta si están en subcarpeta
  try {
    const response = await fetch(apiUrl);
    const files = await response.json();
    // Filtrar solo archivos .json
    const jsonFiles = files.filter(file => file.name.endsWith(".json"));
    return jsonFiles.map(file => file.download_url);
  } catch (error) {
    console.error("Error al obtener la lista de archivos:", error);
    return [];
  }
}

/*********************************
 * 2) CARGAR PARTIDOS DESDE EL REPOSITORIO
 *********************************/
async function loadMatchesFromRepo() {
  const urls = await fetchMatchFiles();
  const allMatches = [];

  // Obtener la fecha actual en formato DD-MM-YYYY
  const today = new Date();
  const currentDay = today.getDate().toString().padStart(2, '0');
  const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
  const currentYear = today.getFullYear().toString();
  selectedDate = `${currentDay}-${currentMonth}-${currentYear}`;

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      const matchesArray = parseMatchesData(data);
      // Agregamos los partidos al array global
      allMatches.push(...matchesArray);
      // Cada partido añade su competición al set
      matchesArray.forEach(match => {
        if (match.competition) competitionSet.add(match.competition);
        // Añadimos la fecha (DD-MM-YYYY) al set de fechas con partidos
        const dateStr = `${match.day}-${match.month}-${match.year}`;
        matchDatesSet.add(dateStr);
      });
    } catch (err) {
      console.error("Error al cargar", url, err);
    }
  }

  // Generar pestañas y filtros de competiciones
  generateCompetitionTabs(Array.from(competitionSet));
  generateCompetitionFilters(Array.from(competitionSet));

  // Ordenar los partidos por hora
  allMatches.sort((a, b) => {
    const [hourA, minuteA] = a.time.split(':').map(Number);
    const [hourB, minuteB] = b.time.split(':').map(Number);
    return hourA !== hourB ? hourA - hourB : minuteA - minuteB;
  });

  // Crear todas las tarjetas pero inicialmente ocultas
  allMatches.forEach(match => {
    const card = createMatchCard(match);
    card.style.display = 'none'; // Ocultar todas las tarjetas inicialmente
    matchesList.appendChild(card);
  });

  // Marcar en el calendario los días que tienen partidos
  markDatesWithMatches();
  
  // Establecer la fecha actual como activa en el calendario
  setDefaultActiveDate();
  
  // Aplicar el filtro inicial para mostrar solo los partidos del día actual
  applyAllFilters();
}

/*********************************
 * 3) PARSEAR LOS DATOS DE UN ARCHIVO JSON
 *********************************/
function parseMatchesData(json) {
  console.log("JSON recibido:", json);
  const matches = [];
  // Si hay un array GAMES, son varios partidos
  if (json.GAMES && Array.isArray(json.GAMES)) {
    json.GAMES.forEach(game => {
      const starttime = game.HEADER.starttime || "00-00-0000 - 00:00";
      const status = game.HEADER.time || "Pendiente";
      const competition = game.HEADER.competition || "";
      const parts = starttime.split(" - ");
      const datePart = parts[0]; // "DD-MM-YYYY"
      const timePart = parts[1] || "";
      const [day, month, year] = datePart.split("-");
      // La puntuación final está en HEADER.TEAM
      const teamA = game.HEADER.TEAM[0];
      const teamB = game.HEADER.TEAM[1];
      const teamAPts = parseInt(teamA.pts, 10) || 0;
      const teamBPts = parseInt(teamB.pts, 10) || 0;

      matches.push({
        starttime,
        day,
        month,
        year,
        time: timePart,
        competition,
        status,
        teamAName: teamA.name || "Equipo A",
        teamALogo: teamA.logo || "https://via.placeholder.com/50",
        teamAPts: teamAPts,
        teamBName: teamB.name || "Equipo B",
        teamBLogo: teamB.logo || "https://via.placeholder.com/50",
        teamBPts: teamBPts
      });
    });
  } else {
    // Un solo partido
    const starttime = json.HEADER.starttime || "00-00-0000 - 00:00";
    const status = json.HEADER.time || "Pendiente";
    const competition = json.HEADER.competition || "";
    const parts = starttime.split(" - ");
    const datePart = parts[0];
    const timePart = parts[1] || "";
    const [day, month, year] = datePart.split("-");
    const teamA = json.HEADER.TEAM[0];
    const teamB = json.HEADER.TEAM[1];
    const teamAPts = parseInt(teamA.pts, 10) || 0;
    const teamBPts = parseInt(teamB.pts, 10) || 0;

    matches.push({
      starttime,
      day,
      month,
      year,
      time: timePart,
      competition,
      status,
      teamAName: teamA.name || "Equipo A",
      teamALogo: teamA.logo || "https://via.placeholder.com/50",
      teamAPts: teamAPts,
      teamBName: teamB.name || "Equipo B",
      teamBLogo: teamB.logo || "https://via.placeholder.com/50",
      teamBPts: teamBPts
    });
  }
  return matches;
}

/*********************************
 * 4) CREAR TARJETA DE PARTIDO
 *********************************/
function createMatchCard(match) {
  const card = document.createElement("div");
  card.className = "match-card";
  const dateStr = `${match.day}-${match.month}-${match.year}`;
  card.setAttribute("data-match-date", dateStr);
  card.setAttribute("data-competition", match.competition);

  // Cabecera
  const headerDiv = document.createElement("div");
  headerDiv.className = "match-header";
  headerDiv.textContent = `${match.starttime} | ${match.competition}`;

  // Equipos
  const teamsDiv = document.createElement("div");
  teamsDiv.className = "teams";

  // Equipo A
  const teamARow = document.createElement("div");
  teamARow.className = "team-row";
  const teamAInfo = document.createElement("div");
  teamAInfo.className = "team-info";
  const teamALogoImg = document.createElement("img");
  teamALogoImg.className = "team-logo";
  teamALogoImg.src = match.teamALogo;
  const teamANameSpan = document.createElement("span");
  teamANameSpan.className = "team-name";
  teamANameSpan.textContent = match.teamAName;
  teamAInfo.appendChild(teamALogoImg);
  teamAInfo.appendChild(teamANameSpan);

  const teamAScoreSpan = document.createElement("span");
  teamAScoreSpan.className = "team-score";
  teamAScoreSpan.textContent = match.teamAPts;

  teamARow.appendChild(teamAInfo);
  teamARow.appendChild(teamAScoreSpan);

  // Equipo B
  const teamBRow = document.createElement("div");
  teamBRow.className = "team-row";
  const teamBInfo = document.createElement("div");
  teamBInfo.className = "team-info";
  const teamBLogoImg = document.createElement("img");
  teamBLogoImg.className = "team-logo";
  teamBLogoImg.src = match.teamBLogo;
  const teamBNameSpan = document.createElement("span");
  teamBNameSpan.className = "team-name";
  teamBNameSpan.textContent = match.teamBName;
  teamBInfo.appendChild(teamBLogoImg);
  teamBInfo.appendChild(teamBNameSpan);

  const teamBScoreSpan = document.createElement("span");
  teamBScoreSpan.className = "team-score";
  teamBScoreSpan.textContent = match.teamBPts;

  teamBRow.appendChild(teamBInfo);
  teamBRow.appendChild(teamBScoreSpan);

  teamsDiv.appendChild(teamARow);
  teamsDiv.appendChild(teamBRow);

  // Footer
  const footerDiv = document.createElement("div");
  footerDiv.className = "match-footer";
  const statusDiv = document.createElement("div");
  statusDiv.className = "match-status";
  statusDiv.textContent = match.status;

  const moreBtn = document.createElement("button");
  moreBtn.className = "btn-more";
  moreBtn.textContent = "Más";
  moreBtn.addEventListener("click", () => {
    window.location.href = "ficha.html";
  });

  footerDiv.appendChild(statusDiv);
  footerDiv.appendChild(moreBtn);

  card.appendChild(headerDiv);
  card.appendChild(teamsDiv);
  card.appendChild(footerDiv);

  return card;
}

/*********************************
 * 5) GENERAR CALENDARIO DE FECHAS PARA 2025
 *********************************/
function generateDays2025() {
  const datesList = document.getElementById("datesList");
  datesList.innerHTML = "";
  const start = new Date("2025-01-01");
  const end = new Date("2026-01-01");
  let current = new Date(start);
  while (current < end) {
    const li = document.createElement("li");
    li.className = "date-item";
    
    const day = current.getDate().toString().padStart(2, '0');
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const year = current.getFullYear();
    const fullDate = `${day}-${month}-${year}`;
    li.dataset.date = fullDate;

    const dayOfWeek = current.toLocaleString("es-ES", { weekday: "short" });
    const dayNumber = current.getDate();
    const dayOfWeekSpan = document.createElement("span");
    dayOfWeekSpan.className = "dayOfWeek";
    dayOfWeekSpan.textContent = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

    const dayNumberSpan = document.createElement("span");
    dayNumberSpan.className = "dayNumber";
    dayNumberSpan.textContent = dayNumber;

    li.appendChild(dayOfWeekSpan);
    li.appendChild(dayNumberSpan);

    datesList.appendChild(li);
    current.setDate(current.getDate() + 1);
  }
}
generateDays2025();

/*********************************
 * 6) ACTUALIZAR TÍTULO DEL MES SEGÚN FECHA ACTIVA
 *********************************/
function updateMonthTitle() {
  const activeItem = document.querySelector(".dates-list .date-item.active");
  if (!activeItem) return;
  const fullDate = activeItem.dataset.date; // "DD-MM-YYYY"
  const [day, month, year] = fullDate.split("-");
  // Crear la fecha con el formato correcto
  const dateObj = new Date(year, parseInt(month) - 1, day);
  const monthName = dateObj.toLocaleString("es-ES", { month: "long" });
  document.getElementById("monthTitle").textContent =
    monthName.charAt(0).toUpperCase() + monthName.slice(1) + " " + year;
}

/*********************************
 * 7) ESTABLECER POR DEFECTO EL DÍA ACTUAL Y CENTRARLO
 *********************************/
function setDefaultActiveDate() {
  const today = new Date();
  if (today.getFullYear() !== 2025) {
    // Si hoy no es 2025, usar primer día
    const first = document.querySelector(".dates-list .date-item");
    if (first) {
      first.classList.add("active");
      updateMonthTitle();
      first.scrollIntoView({ behavior: "smooth", inline: "center" });
    }
    return;
  }
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  const todayStr = `${day}-${month}-${year}`;
  const targetItem = document.querySelector(`.date-item[data-date="${todayStr}"]`);
  if (targetItem) {
    targetItem.classList.add("active");
    updateMonthTitle();
    targetItem.scrollIntoView({ behavior: "smooth", inline: "center" });
  }
}
setDefaultActiveDate();

/*********************************
 * 8) SCROLL DE FECHAS CON FLECHAS
 *********************************/
const arrowLeft = document.getElementById("arrowLeft");
const arrowRight = document.getElementById("arrowRight");
arrowLeft.addEventListener("click", () => {
  document.getElementById("datesList").scrollBy({ left: -100, behavior: "smooth" });
});
arrowRight.addEventListener("click", () => {
  document.getElementById("datesList").scrollBy({ left: 100, behavior: "smooth" });
});

/*********************************
 * 9) SELECCIÓN DE DÍA Y FILTRADO (combinado)
 *********************************/
document.getElementById("datesList").addEventListener("click", (e) => {
  const clickedItem = e.target.closest(".date-item");
  if (!clickedItem) return;
  [...document.querySelectorAll(".date-item")].forEach(item => item.classList.remove("active"));
  clickedItem.classList.add("active");
  updateMonthTitle();

  // Guardamos la fecha seleccionada
  selectedDate = clickedItem.dataset.date;
  // Aplicamos todos los filtros (fecha, competición, género)
  applyAllFilters();
});

/*********************************
 * 10) FLATPICKR EN UN MODAL
 *********************************/
const datePickerModal = document.createElement("div");
datePickerModal.id = "datePickerModal";
datePickerModal.style.position = "fixed";
datePickerModal.style.top = "0";
datePickerModal.style.left = "0";
datePickerModal.style.width = "100%";
datePickerModal.style.height = "100%";
datePickerModal.style.backgroundColor = "rgba(0,0,0,0.5)";
datePickerModal.style.display = "none";
datePickerModal.style.alignItems = "center";
datePickerModal.style.justifyContent = "center";
datePickerModal.innerHTML = `
  <div style="background: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
    <h3 style="color: #111C4E;">Selecciona una fecha</h3>
    <div id="modalDatePicker"></div>
    <br>
    <button id="modalDatePickerBtn" style="padding: 8px 16px; background: #FF9E1B; color: #111C4E; border: none; border-radius: 4px; font-weight: bold;">Cerrar</button>
  </div>
`;
document.body.appendChild(datePickerModal);

flatpickr("#modalDatePicker", {
  inline: true,
  defaultDate: new Date(),
  dateFormat: "d-m-Y",
  onChange: function(selectedDates, dateStr, instance) {
    selectedDate = dateStr;
    datePickerModal.style.display = "none";

    const targetItem = document.querySelector(`.date-item[data-date="${dateStr}"]`);
    if (targetItem) {
      targetItem.scrollIntoView({ behavior: "smooth", inline: "center" });
      [...document.querySelectorAll(".date-item")].forEach(item => item.classList.remove("active"));
      targetItem.classList.add("active");
      updateMonthTitle();
    }
    applyAllFilters();
  }
});

document.getElementById("modalDatePickerBtn").addEventListener("click", () => {
  datePickerModal.style.display = "none";
});

const openDatePicker = document.getElementById("openDatePicker");
openDatePicker.addEventListener("click", () => {
  datePickerModal.style.display = "flex";
});

/*********************************
 * 11) COMPETITION TABS (COMBINADO)
 *********************************/
const competitionsBar = document.getElementById("competitionsBar");
function generateCompetitionTabs(competitions) {
  competitionsBar.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "competition-tab active";
  allBtn.textContent = "TODAS";
  allBtn.dataset.competition = "";
  competitionsBar.appendChild(allBtn);

  competitions.forEach(comp => {
    const btn = document.createElement("button");
    btn.className = "competition-tab";
    btn.textContent = comp;
    btn.dataset.competition = comp;
    competitionsBar.appendChild(btn);
  });

  competitionsBar.querySelectorAll(".competition-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      competitionsBar.querySelectorAll(".competition-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // Guardamos la competición seleccionada
      selectedCompetition = btn.dataset.competition || "";
      // Aplicamos todos los filtros
      applyAllFilters();
    });
  });
}

/*********************************
 * 12) FILTROS EN EL OVERLAY (competición y género)
 *********************************/
function generateCompetitionFilters(competitions) {
  const compFiltersList = document.getElementById("competitionFilters");
  compFiltersList.innerHTML = "";
  const allItem = document.createElement("li");
  allItem.dataset.competition = "";
  allItem.textContent = "TODAS";
  compFiltersList.appendChild(allItem);

  competitions.forEach(comp => {
    const li = document.createElement("li");
    li.dataset.competition = comp;
    li.textContent = comp;
    compFiltersList.appendChild(li);
  });
}

// Al hacer clic en "FILTROS" abrimos overlay
const openFiltersBtn = document.getElementById("openFiltersBtn");
const closeFiltersBtn = document.getElementById("closeFiltersBtn");
const filtersOverlay = document.getElementById("filtersOverlay");
openFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.add("open");
});
closeFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.remove("open");
});

const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");

// Capturar clics en la lista de competiciones o géneros
document.querySelector(".filters-content").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  if (li.dataset.competition !== undefined) {
    selectedCompetition = li.dataset.competition;
  }
  if (li.dataset.gender !== undefined) {
    selectedGender = li.dataset.gender;
  }
});

clearFiltersBtn.addEventListener("click", () => {
  selectedCompetition = null;
  selectedGender = null;
  filtersOverlay.classList.remove("open");
  applyAllFilters();
});

applyFiltersBtn.addEventListener("click", () => {
  filtersOverlay.classList.remove("open");
  applyAllFilters();
});

/*********************************
 * 13) APLICAR TODOS LOS FILTROS (DÍA, COMPETICIÓN, GÉNERO)
 *********************************/
function applyAllFilters() {
  document.querySelectorAll(".match-card").forEach(card => {
    let show = true;

    // 1) Filtro por fecha
    if (selectedDate) {
      const matchDate = card.getAttribute("data-match-date");
      if (matchDate !== selectedDate) {
        show = false;
      }
    }

    // 2) Filtro por competición
    if (selectedCompetition) {
      const comp = card.getAttribute("data-competition") || "";
      if (selectedCompetition !== "" && comp !== selectedCompetition) {
        show = false;
      }
    }

    // 3) Filtro por género (si lo tuvieras en data-gender)
    if (selectedGender) {
      const gen = card.getAttribute("data-gender") || "";
      if (selectedGender !== "" && gen !== selectedGender) {
        show = false;
      }
    }

    card.style.display = show ? "flex" : "none";
  });
}

/*********************************
 * 14) MARCAR EN EL CALENDARIO LOS DÍAS QUE TIENEN PARTIDOS
 *********************************/
function markDatesWithMatches() {
  const dateItems = document.querySelectorAll(".date-item");
  dateItems.forEach(li => {
    if (matchDatesSet.has(li.dataset.date)) {
      // Añadir indicador si no existe ya
      if (!li.querySelector(".match-indicator")) {
        const indicator = document.createElement("span");
        indicator.className = "match-indicator";
        li.appendChild(indicator);
      }
    }
  });
}

/*********************************
 * 15) INICIAR CARGA DE PARTIDOS
 *********************************/
const matchesList = document.getElementById("matchesList");
loadMatchesFromRepo();

console.log("Si subes nuevos JSON al repositorio, se cargarán automáticamente al recargar la página."); 
