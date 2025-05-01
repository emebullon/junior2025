/***************************************
 * Variables globales
 ***************************************/
let allPlayersStats = [];
let competitionSet = new Set();
let teamSet = new Set();
let roundSet = new Set();

let currentSortCol = null;
let currentSortOrder = "desc";

let currentPage = 1;
const itemsPerPage = 50;

/***************************************
 * Funciones de Responsividad
 ***************************************/
function setupMobileColumns() {
  const toggleButton = document.getElementById('toggleColumns');
  const tableContainer = document.querySelector('.stats-table-container');
  
  if (toggleButton && tableContainer) {
    toggleButton.addEventListener('click', () => {
      tableContainer.classList.toggle('mobile-all-columns');
      
      // Actualizar el texto del botón
      if (tableContainer.classList.contains('mobile-all-columns')) {
        toggleButton.textContent = 'Mostrar datos básicos';
        // Ajustar el scroll para mostrar las estadísticas adicionales
        setTimeout(() => {
          tableContainer.scrollLeft = 0;
        }, 100);
      } else {
        toggleButton.textContent = 'Mostrar más datos';
        // Resetear el scroll cuando volvemos a la vista básica
        tableContainer.scrollLeft = 0;
      }
    });

    // Añadir indicador de scroll
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    tableContainer.appendChild(scrollIndicator);

    // Mostrar/ocultar indicador de scroll según sea necesario
    tableContainer.addEventListener('scroll', () => {
      const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;
      if (tableContainer.classList.contains('mobile-all-columns')) {
        scrollIndicator.style.opacity = tableContainer.scrollLeft < maxScroll ? '1' : '0';
      } else {
        scrollIndicator.style.opacity = '0';
      }
    });
  }
}

function setupMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.querySelector('.main-nav');
  const body = document.body;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  body.appendChild(overlay);

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
      overlay.classList.toggle('active');
      body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
    });

    overlay.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mainNav.classList.remove('active');
      overlay.classList.remove('active');
      body.style.overflow = '';
    });

    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        overlay.classList.remove('active');
        body.style.overflow = '';
      });
    });
  }
}

/***************************************
 * Funciones principales
 ***************************************/
async function fetchMatchFiles() {
  const apiUrl = "https://api.github.com/repos/emebullon/junior2025/contents/";
  try {
    const response = await fetch(apiUrl);
    const files = await response.json();
    return files.filter(file => file.name.endsWith(".json")).map(file => file.download_url);
  } catch (error) {
    console.error("Error al obtener la lista de archivos:", error);
    return [];
  }
}

function isGroupPhase(round) {
  // Si es una letra sola (A, B, C, D, E, F, G, H) es fase de grupos
  return /^[A-H]$/.test(round.trim());
}

// Añadir función para convertir minutos formateados a segundos
function minutesToSeconds(minFormatted) {
  if (!minFormatted) return 0;
  const [minutes, seconds] = minFormatted.split(':').map(Number);
  return minutes * 60 + seconds;
}

// Añadir función para convertir segundos a formato MM:SS
function secondsToMinutes(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function loadAllStats() {
  const urls = await fetchMatchFiles();
  const totalFiles = urls.length;
  let processedFiles = 0;
  const playersMap = new Map();
  const loaderText = document.querySelector('.loader-text');
  const progressBar = document.querySelector('.progress-bar-fill');

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();

      // Actualizar el progreso
      processedFiles++;
      const progress = Math.round((processedFiles / totalFiles) * 100);
      loaderText.textContent = `Cargando estadísticas... ${progress}%`;
      progressBar.style.width = `${progress}%`;

      const comp = data.HEADER.competition || "";
      const round = data.HEADER.round || "";
      competitionSet.add(comp);

      const matchDate = data.HEADER.starttime || "";

      // NUEVO: Usar HEADER.TEAM para puntos/nombre/logo y SCOREBOARD.TEAM para jugadores
      const teamAHeader = data.HEADER.TEAM[0];
      const teamBHeader = data.HEADER.TEAM[1];
      const teamA = data.SCOREBOARD.TEAM[0];
      const teamB = data.SCOREBOARD.TEAM[1];

      const teamAPoints = parseInt(teamAHeader.pts, 10) || 0;
      const teamBPoints = parseInt(teamBHeader.pts, 10) || 0;

      const teamAName = teamAHeader.name || "Equipo A";
      const teamBName = teamBHeader.name || "Equipo B";

      const currentPhase = isGroupPhase(round) ? "Fase de Grupos" : "Playoffs";

      const femaleCompetitions = [
        "LF Endesa",
        "LF Challenge",
        "L.F. 2",
        "C ESP CLUBES JR FEM",
        "CE SSAA Cadete Fem.",
        "CE SSA Infantil Fem."
      ];
      let genero = "H";
      if (femaleCompetitions.some(f => f.toLowerCase() === comp.trim().toLowerCase())) {
        genero = "M";
      }

      // --- Jugadores del equipo A ---
      (teamA.PLAYER || []).forEach((player) => {
        const teamName = teamAName;
        teamSet.add(teamName);

        const rivalName = teamBName;

        const p2a = parseInt(player.p2a || 0);
        const p2m = parseInt(player.p2m || 0);
        const p3a = parseInt(player.p3a || 0);
        const p3m = parseInt(player.p3m || 0);
        const p1a = parseInt(player.p1a || 0);
        const p1m = parseInt(player.p1m || 0);

        // Crear IDs únicos para cada fase y total
        const totalId = `${player.id}-${teamName}-${comp}-total`;
        const groupPhaseId = `${player.id}-${teamName}-${comp}-grupos`;
        const playoffsId = `${player.id}-${teamName}-${comp}-playoffs`;

        // Inicializar registros si no existen
        [totalId, groupPhaseId, playoffsId].forEach(id => {
          if (!playersMap.has(id)) {
            playersMap.set(id, {
              dorsal: player.no || "",
              playerPhoto: player.logo || "https://via.placeholder.com/50",
              playerName: player.name || "Desconocido",
              teamName,
              competition: comp,
              round: round,
              phaseType: id.endsWith('total') ? "" : (id.endsWith('grupos') ? "Fase de Grupos" : "Playoffs"),
              gender: genero,
              games: 0,
              seconds: 0,
              pts: 0,
              t2i: 0,
              t2c: 0,
              t3i: 0,
              t3c: 0,
              tli: 0,
              tlc: 0,
              ro: 0,
              rd: 0,
              rt: 0,
              as: 0,
              br: 0,
              bp: 0,
              tp: 0,
              fc: 0,
              va: 0,
              pm: 0,
              matches: []
            });
          }
        });

        // Actualizar estadísticas en el registro total y de fase
        const totalRecord = playersMap.get(totalId);
        const phaseRecord = playersMap.get(currentPhase === "Fase de Grupos" ? groupPhaseId : playoffsId);

        [totalRecord, phaseRecord].forEach(record => {
          record.games += 1;
          record.seconds += minutesToSeconds(player.minFormatted || "0:00");

          record.pts += parseInt(player.pts || 0);
          record.t2i += p2a;
          record.t2c += p2m;
          record.t3i += p3a;
          record.t3c += p3m;
          record.tli += p1a;
          record.tlc += p1m;
          record.ro += parseInt(player.ro || 0);
          record.rd += parseInt(player.rd || 0);
          record.rt += parseInt(player.rt || 0);
          record.as += parseInt(player.assist || 0);
          record.br += parseInt(player.st || 0);
          record.bp += parseInt(player.to || 0);
          record.tp += parseInt(player.bs || 0);
          record.fc += parseInt(player.pf || 0);
          record.va += parseInt(player.val || 0);
          record.pm += parseInt(player.pllss || 0);

          const pct2 = (p2a > 0) ? ((p2m / p2a) * 100).toFixed(1) : "0.0";
          const pct3 = (p3a > 0) ? ((p3m / p3a) * 100).toFixed(1) : "0.0";
          const pctTl = (p1a > 0) ? ((p1m / p1a) * 100).toFixed(1) : "0.0";

          record.matches.push({
            matchDate,
            round: round,
            phaseType: currentPhase,
            rival: rivalName,
            rivalFull: rivalName,
            rivalShort: rivalName.substring(0, 3).toUpperCase(),
            minutes: player.minFormatted || "0:00",
            pts: parseInt(player.pts || 0),
            t2i: p2a,
            t2c: p2m,
            pct2,
            t3i: p3a,
            t3c: p3m,
            pct3,
            tli: p1a,
            tlc: p1m,
            pctTl,
            ro: parseInt(player.ro || 0),
            rd: parseInt(player.rd || 0),
            rt: parseInt(player.rt || 0),
            as: parseInt(player.assist || 0),
            br: parseInt(player.st || 0),
            bp: parseInt(player.to || 0),
            tp: parseInt(player.bs || 0),
            fc: parseInt(player.pf || 0),
            va: parseInt(player.val || 0),
            pm: parseInt(player.pllss || 0),
            teamPoints: teamAPoints,
            rivalPoints: teamBPoints,
            resultado: teamAPoints > teamBPoints ? "G" : "P",
            marcador: `${teamAPoints}-${teamBPoints}`
          });
        });

        // Después de actualizar los totales:
        totalRecord.pct2 = totalRecord.t2i > 0 ? ((totalRecord.t2c / totalRecord.t2i) * 100).toFixed(1) : "0.0";
        totalRecord.pct3 = totalRecord.t3i > 0 ? ((totalRecord.t3c / totalRecord.t3i) * 100).toFixed(1) : "0.0";
        totalRecord.pctTl = totalRecord.tli > 0 ? ((totalRecord.tlc / totalRecord.tli) * 100).toFixed(1) : "0.0";
        phaseRecord.pct2 = phaseRecord.t2i > 0 ? ((phaseRecord.t2c / phaseRecord.t2i) * 100).toFixed(1) : "0.0";
        phaseRecord.pct3 = phaseRecord.t3i > 0 ? ((phaseRecord.t3c / phaseRecord.t3i) * 100).toFixed(1) : "0.0";
        phaseRecord.pctTl = phaseRecord.tli > 0 ? ((phaseRecord.tlc / phaseRecord.tli) * 100).toFixed(1) : "0.0";
      });

      // --- Jugadores del equipo B ---
      (teamB.PLAYER || []).forEach((player) => {
        const teamName = teamBName;
        teamSet.add(teamName);

        const rivalName = teamAName;

        const p2a = parseInt(player.p2a || 0);
        const p2m = parseInt(player.p2m || 0);
        const p3a = parseInt(player.p3a || 0);
        const p3m = parseInt(player.p3m || 0);
        const p1a = parseInt(player.p1a || 0);
        const p1m = parseInt(player.p1m || 0);

        // Crear IDs únicos para cada fase y total
        const totalId = `${player.id}-${teamName}-${comp}-total`;
        const groupPhaseId = `${player.id}-${teamName}-${comp}-grupos`;
        const playoffsId = `${player.id}-${teamName}-${comp}-playoffs`;

        // Inicializar registros si no existen
        [totalId, groupPhaseId, playoffsId].forEach(id => {
          if (!playersMap.has(id)) {
            playersMap.set(id, {
              dorsal: player.no || "",
              playerPhoto: player.logo || "https://via.placeholder.com/50",
              playerName: player.name || "Desconocido",
              teamName,
              competition: comp,
              round: round,
              phaseType: id.endsWith('total') ? "" : (id.endsWith('grupos') ? "Fase de Grupos" : "Playoffs"),
              gender: genero,
              games: 0,
              seconds: 0,
              pts: 0,
              t2i: 0,
              t2c: 0,
              t3i: 0,
              t3c: 0,
              tli: 0,
              tlc: 0,
              ro: 0,
              rd: 0,
              rt: 0,
              as: 0,
              br: 0,
              bp: 0,
              tp: 0,
              fc: 0,
              va: 0,
              pm: 0,
              matches: []
            });
          }
        });

        // Actualizar estadísticas en el registro total y de fase
        const totalRecord = playersMap.get(totalId);
        const phaseRecord = playersMap.get(currentPhase === "Fase de Grupos" ? groupPhaseId : playoffsId);

        [totalRecord, phaseRecord].forEach(record => {
          record.games += 1;
          record.seconds += minutesToSeconds(player.minFormatted || "0:00");

          record.pts += parseInt(player.pts || 0);
          record.t2i += p2a;
          record.t2c += p2m;
          record.t3i += p3a;
          record.t3c += p3m;
          record.tli += p1a;
          record.tlc += p1m;
          record.ro += parseInt(player.ro || 0);
          record.rd += parseInt(player.rd || 0);
          record.rt += parseInt(player.rt || 0);
          record.as += parseInt(player.assist || 0);
          record.br += parseInt(player.st || 0);
          record.bp += parseInt(player.to || 0);
          record.tp += parseInt(player.bs || 0);
          record.fc += parseInt(player.pf || 0);
          record.va += parseInt(player.val || 0);
          record.pm += parseInt(player.pllss || 0);

          const pct2 = (p2a > 0) ? ((p2m / p2a) * 100).toFixed(1) : "0.0";
          const pct3 = (p3a > 0) ? ((p3m / p3a) * 100).toFixed(1) : "0.0";
          const pctTl = (p1a > 0) ? ((p1m / p1a) * 100).toFixed(1) : "0.0";

          record.matches.push({
            matchDate,
            round: round,
            phaseType: currentPhase,
            rival: rivalName,
            rivalFull: rivalName,
            rivalShort: rivalName.substring(0, 3).toUpperCase(),
            minutes: player.minFormatted || "0:00",
            pts: parseInt(player.pts || 0),
            t2i: p2a,
            t2c: p2m,
            pct2,
            t3i: p3a,
            t3c: p3m,
            pct3,
            tli: p1a,
            tlc: p1m,
            pctTl,
            ro: parseInt(player.ro || 0),
            rd: parseInt(player.rd || 0),
            rt: parseInt(player.rt || 0),
            as: parseInt(player.assist || 0),
            br: parseInt(player.st || 0),
            bp: parseInt(player.to || 0),
            tp: parseInt(player.bs || 0),
            fc: parseInt(player.pf || 0),
            va: parseInt(player.val || 0),
            pm: parseInt(player.pllss || 0),
            teamPoints: teamBPoints,
            rivalPoints: teamAPoints,
            resultado: teamBPoints > teamAPoints ? "G" : "P",
            marcador: `${teamBPoints}-${teamAPoints}`
          });
        });

        // Después de actualizar los totales:
        totalRecord.pct2 = totalRecord.t2i > 0 ? ((totalRecord.t2c / totalRecord.t2i) * 100).toFixed(1) : "0.0";
        totalRecord.pct3 = totalRecord.t3i > 0 ? ((totalRecord.t3c / totalRecord.t3i) * 100).toFixed(1) : "0.0";
        totalRecord.pctTl = totalRecord.tli > 0 ? ((totalRecord.tlc / totalRecord.tli) * 100).toFixed(1) : "0.0";
        phaseRecord.pct2 = phaseRecord.t2i > 0 ? ((phaseRecord.t2c / phaseRecord.t2i) * 100).toFixed(1) : "0.0";
        phaseRecord.pct3 = phaseRecord.t3i > 0 ? ((phaseRecord.t3c / phaseRecord.t3i) * 100).toFixed(1) : "0.0";
        phaseRecord.pctTl = phaseRecord.tli > 0 ? ((phaseRecord.tlc / phaseRecord.tli) * 100).toFixed(1) : "0.0";
      });
    } catch (err) {
      console.error("Error al cargar", url, err);
      processedFiles++; // Incrementar aunque haya error para mantener el progreso
      const progress = Math.round((processedFiles / totalFiles) * 100);
      progressBar.style.width = `${progress}%`;
    }
  }

  allPlayersStats = Array.from(playersMap.values());
  fillSelects();
  applyFilters();
}

function fillSelects() {
  const filterCompetition = document.getElementById("filterCompetition");
  const filterTeam = document.getElementById("filterTeam");
  const filterRound = document.getElementById("filterRound");

  competitionSet.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filterCompetition.appendChild(opt);
  });

  [...teamSet].sort((a, b) => a.localeCompare(b)).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    filterTeam.appendChild(opt);
  });

  // Limpiar y añadir las dos opciones principales al select de fases
  filterRound.innerHTML = `
    <option value="">-- Fase --</option>
    <option value="Fase de Grupos">Fase de Grupos</option>
    <option value="Playoffs">Playoffs</option>
  `;
}

function applyFilters() {
  const compSel = document.getElementById("filterCompetition").value;
  const teamSel = document.getElementById("filterTeam").value;
  const genderSel = document.getElementById("filterGender").value;
  const phaseSel = document.getElementById("filterRound").value;
  const modeToggle = document.getElementById("modeToggle");
  const searchInput = document.getElementById("searchPlayerTeam");
  const searchTerm = searchInput.value.toLowerCase();

  let filteredData = allPlayersStats.filter(player => {
    // Si no hay fase seleccionada, mostrar solo los registros totales
    if (!phaseSel && player.phaseType !== "") {
      return false;
    }
    // Si hay fase seleccionada, mostrar solo los registros de esa fase
    if (phaseSel && player.phaseType !== phaseSel) {
      return false;
    }

    const matchesComp = !compSel || player.competition === compSel;
    const matchesTeam = !teamSel || player.teamName === teamSel;
    const matchesGender = !genderSel || player.gender === genderSel;
    const matchesSearch = !searchTerm || 
      player.playerName.toLowerCase().includes(searchTerm) || 
      player.teamName.toLowerCase().includes(searchTerm);

    return matchesComp && matchesTeam && matchesGender && matchesSearch;
  });

  if (currentSortCol) {
    filteredData = sortArray(filteredData, currentSortCol, currentSortOrder, modeToggle.checked ? "promedios" : "totales");
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  renderTable(paginatedData, modeToggle.checked ? "promedios" : "totales");
  updatePaginationInfo(filteredData.length);
}

function limitName(name, maxChars = 15) {
  return name.length > maxChars ? name.substring(0, maxChars) + "..." : name;
}

function getInitials(name) {
  return name.split(" ").map(word => word[0]).join("");
}

function showPlayerMatches(playerData) {
  // Encontrar la celda del jugador
  const playerCell = document.querySelector(`td.player-name[onclick*="${playerData.playerName}"]`);
  if (playerCell) {
    const row = playerCell.parentElement;
    toggleMatchDetails(row.querySelector('.games-cell'), playerData);
  }
}

function renderTable(data, mode = "totales") {
  const tbody = document.querySelector("#statsTable tbody");
  tbody.innerHTML = "";

  data.forEach((player, index) => {
    const row = document.createElement("tr");
    const rank = (currentPage - 1) * itemsPerPage + index + 1;

    // Calcular minutos promedio si es necesario
    const minutes = mode === "totales" 
      ? secondsToMinutes(player.seconds)
      : secondsToMinutes(Math.round(player.seconds / player.games));

    // Calcular los valores que se mostrarán
    const pts = mode === "totales" ? player.pts : (player.pts / player.games).toFixed(1);
    const t2c = mode === "totales" ? player.t2c : (player.t2c / player.games).toFixed(1);
    const t2i = mode === "totales" ? player.t2i : (player.t2i / player.games).toFixed(1);
    const t3c = mode === "totales" ? player.t3c : (player.t3c / player.games).toFixed(1);
    const t3i = mode === "totales" ? player.t3i : (player.t3i / player.games).toFixed(1);
    const tlc = mode === "totales" ? player.tlc : (player.tlc / player.games).toFixed(1);
    const tli = mode === "totales" ? player.tli : (player.tli / player.games).toFixed(1);
    const ro = mode === "totales" ? player.ro : (player.ro / player.games).toFixed(1);
    const rd = mode === "totales" ? player.rd : (player.rd / player.games).toFixed(1);
    const rt = mode === "totales" ? player.rt : (player.rt / player.games).toFixed(1);
    const as = mode === "totales" ? player.as : (player.as / player.games).toFixed(1);
    const br = mode === "totales" ? player.br : (player.br / player.games).toFixed(1);
    const bp = mode === "totales" ? player.bp : (player.bp / player.games).toFixed(1);
    const tp = mode === "totales" ? player.tp : (player.tp / player.games).toFixed(1);
    const fc = mode === "totales" ? player.fc : (player.fc / player.games).toFixed(1);
    const va = mode === "totales" ? player.va : (player.va / player.games).toFixed(1);
    const pm = mode === "totales" ? player.pm : (player.pm / player.games).toFixed(1);

    // Calcular porcentajes
    const pct2 = player.t2i > 0 ? ((player.t2c / player.t2i) * 100).toFixed(1) : "0.0";
    const pct3 = player.t3i > 0 ? ((player.t3c / player.t3i) * 100).toFixed(1) : "0.0";
    const pctTl = player.tli > 0 ? ((player.tlc / player.tli) * 100).toFixed(1) : "0.0";

    // Extraer solo los minutos del string "MM:SS"
    const minutesPlayed = parseInt(minutes.split(':')[0]);
    
    // Calcular el impacto
    const impact = minutesPlayed > 0 ? ((parseFloat(va) + parseFloat(pm)) / minutesPlayed).toFixed(2) : "0.00";

    // Abreviar nombre del equipo
    const teamName = player.teamName;
    const shortTeamName = teamName.length > 3 ? teamName.substring(0, 3) : teamName;

    row.innerHTML = `
      <td>${rank}</td>
      <td>${player.dorsal}</td>
      <td><img src="${player.playerPhoto}" alt="${player.playerName}" class="player-photo"></td>
      <td class="player-name" onclick='showPlayerMatches(${JSON.stringify(player).replace(/'/g, "\\'")})'
          style="cursor: pointer">${limitName(player.playerName)}</td>
      <td class="team-name" data-fullname="${teamName}">${shortTeamName}</td>
      <td data-col="min">${minutes}</td>
      <td data-col="pts">${pts}</td>
      <td data-col="t2c">${t2c}</td>
      <td data-col="t2i">${t2i}</td>
      <td data-col="pct2">${pct2}</td>
      <td data-col="t3c">${t3c}</td>
      <td data-col="t3i">${t3i}</td>
      <td data-col="pct3">${pct3}</td>
      <td data-col="tlc">${tlc}</td>
      <td data-col="tli">${tli}</td>
      <td data-col="pctTl">${pctTl}</td>
      <td data-col="ro">${ro}</td>
      <td data-col="rd">${rd}</td>
      <td data-col="rt">${rt}</td>
      <td data-col="as">${as}</td>
      <td data-col="br">${br}</td>
      <td data-col="bp">${bp}</td>
      <td data-col="tp">${tp}</td>
      <td data-col="fc">${fc}</td>
      <td data-col="va">${va}</td>
      <td data-col="pm">${pm}</td>
      <td data-col="imp">${impact}</td>
      <td class="games-cell" onclick="toggleMatchDetails(this, ${JSON.stringify(player).replace(/"/g, '&quot;')})">${player.games}</td>
    `;

    tbody.appendChild(row);
  });
}

function toggleMatchDetails(cell, player) {
  const row = cell.parentElement;
  const nextRow = row.nextElementSibling;

  if (nextRow && nextRow.classList.contains("details-row")) {
    nextRow.remove();
  } else {
    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 28;
    
    const detailsTable = document.createElement("table");
    detailsTable.className = "match-details-table";

    // Encontrar los valores máximos para cada estadística
    const maxValues = {
      pts: Math.max(...player.matches.map(m => m.pts)),
      t2c: Math.max(...player.matches.map(m => m.t2c)),
      t2i: Math.max(...player.matches.map(m => m.t2i)),
      t3c: Math.max(...player.matches.map(m => m.t3c)),
      t3i: Math.max(...player.matches.map(m => m.t3i)),
      tlc: Math.max(...player.matches.map(m => m.tlc)),
      tli: Math.max(...player.matches.map(m => m.tli)),
      ro: Math.max(...player.matches.map(m => m.ro)),
      rd: Math.max(...player.matches.map(m => m.rd)),
      rt: Math.max(...player.matches.map(m => m.rt)),
      as: Math.max(...player.matches.map(m => m.as)),
      br: Math.max(...player.matches.map(m => m.br)),
      bp: Math.max(...player.matches.map(m => m.bp)),
      tp: Math.max(...player.matches.map(m => m.tp)),
      fc: Math.max(...player.matches.map(m => m.fc)),
      va: Math.max(...player.matches.map(m => m.va)),
      pm: Math.max(...player.matches.map(m => m.pm))
    };
    
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th data-sort="date">Fecha</th>
        <th data-sort="rival">Rival</th>
        <th data-sort="resultado">Resultado</th>
        <th data-sort="min">MIN</th>
        <th data-sort="pts">PTS</th>
        <th data-sort="t2c">T2C</th>
        <th data-sort="t2i">T2I</th>
        <th data-sort="pct2">%T2</th>
        <th data-sort="t3c">T3C</th>
        <th data-sort="t3i">T3I</th>
        <th data-sort="pct3">%T3</th>
        <th data-sort="tlc">TLC</th>
        <th data-sort="tli">TLI</th>
        <th data-sort="pctTl">%TL</th>
        <th data-sort="ro">RO</th>
        <th data-sort="rd">RD</th>
        <th data-sort="rt">RT</th>
        <th data-sort="as">AS</th>
        <th data-sort="br">BR</th>
        <th data-sort="bp">BP</th>
        <th data-sort="tp">TP</th>
        <th data-sort="fc">FC</th>
        <th data-sort="va">VA</th>
        <th data-sort="pm">+/-</th>
        <th data-sort="imp">IMP</th>
      </tr>
    `;

    // Añadir evento de click para ordenación
    thead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const sortKey = th.dataset.sort;
        const currentOrder = th.classList.contains('sorted-asc') ? 'desc' : 'asc';
        
        // Limpiar clases de ordenación previas
        thead.querySelectorAll('th').forEach(header => {
          header.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        // Añadir clase de ordenación actual
        th.classList.add(`sorted-${currentOrder}`);
        
        // Ordenar los datos
        const tbody = detailsTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
          let aVal = a.querySelector(`td[data-sort="${sortKey}"]`).dataset.value;
          let bVal = b.querySelector(`td[data-sort="${sortKey}"]`).dataset.value;
          
          // Forzar conversión a número para columnas numéricas y porcentajes
          if (
            ["pct2", "pct3", "pctTl", "t2c", "t2i", "t3c", "t3i", "tlc", "tli", "pts", "min", "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm"].includes(sortKey)
          ) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          }
          
          if (currentOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
        
        // Reordenar las filas
        rows.forEach(row => tbody.appendChild(row));
      });
    });
    
    const tbody = document.createElement("tbody");
    
    // Ordenar los partidos por fecha (de más antiguo a más nuevo)
    player.matches.sort((a, b) => {
      // Convertir fechas en formato DD-MM-YYYY a objetos Date
      const [dayA, monthA, yearA] = a.matchDate.split('-');
      const [dayB, monthB, yearB] = b.matchDate.split('-');
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA - dateB;
    });

    player.matches.forEach(match => {
      const resultadoStr = `<span style="color:${match.resultado === 'G' ? 'green' : 'red'};font-weight:bold">${match.resultado}</span> ${match.marcador}`;
      const rivalShort = match.rivalShort || (match.rival ? match.rival.substring(0, 3).toUpperCase() : "");
      const rivalFull = match.rivalFull || match.rival || "";
      
      // Calcular el impacto
      const minutes = parseInt(match.minutes.split(':')[0]);
      const impact = minutes > 0 ? ((match.va + match.pm) / minutes).toFixed(2) : "0.00";
      
      const matchRow = document.createElement("tr");
      matchRow.innerHTML = `
        <td data-sort="date" data-value="${match.matchDate}">${match.matchDate}</td>
        <td data-sort="rival" data-value="${rivalShort}" title="${rivalFull}">${rivalShort}</td>
        <td data-sort="resultado" data-value="${match.resultado}">${resultadoStr}</td>
        <td data-sort="min" data-value="${minutesToSeconds(match.minutes)}">${match.minutes}</td>
        <td data-sort="pts" data-value="${match.pts}" ${match.pts === maxValues.pts ? 'class="max-value"' : ''}>${match.pts}</td>
        <td data-sort="t2c" data-value="${match.t2c}" ${match.t2c === maxValues.t2c ? 'class="max-value"' : ''}>${match.t2c}</td>
        <td data-sort="t2i" data-value="${match.t2i}" ${match.t2i === maxValues.t2i ? 'class="max-value"' : ''}>${match.t2i}</td>
        <td data-sort="pct2" data-value="${match.pct2}">${match.pct2}</td>
        <td data-sort="t3c" data-value="${match.t3c}" ${match.t3c === maxValues.t3c ? 'class="max-value"' : ''}>${match.t3c}</td>
        <td data-sort="t3i" data-value="${match.t3i}" ${match.t3i === maxValues.t3i ? 'class="max-value"' : ''}>${match.t3i}</td>
        <td data-sort="pct3" data-value="${match.pct3}">${match.pct3}</td>
        <td data-sort="tlc" data-value="${match.tlc}" ${match.tlc === maxValues.tlc ? 'class="max-value"' : ''}>${match.tlc}</td>
        <td data-sort="tli" data-value="${match.tli}" ${match.tli === maxValues.tli ? 'class="max-value"' : ''}>${match.tli}</td>
        <td data-sort="pctTl" data-value="${match.pctTl}">${match.pctTl}</td>
        <td data-sort="ro" data-value="${match.ro}" ${match.ro === maxValues.ro ? 'class="max-value"' : ''}>${match.ro}</td>
        <td data-sort="rd" data-value="${match.rd}" ${match.rd === maxValues.rd ? 'class="max-value"' : ''}>${match.rd}</td>
        <td data-sort="rt" data-value="${match.rt}" ${match.rt === maxValues.rt ? 'class="max-value"' : ''}>${match.rt}</td>
        <td data-sort="as" data-value="${match.as}" ${match.as === maxValues.as ? 'class="max-value"' : ''}>${match.as}</td>
        <td data-sort="br" data-value="${match.br}" ${match.br === maxValues.br ? 'class="max-value"' : ''}>${match.br}</td>
        <td data-sort="bp" data-value="${match.bp}" ${match.bp === maxValues.bp ? 'class="max-value"' : ''}>${match.bp}</td>
        <td data-sort="tp" data-value="${match.tp}" ${match.tp === maxValues.tp ? 'class="max-value"' : ''}>${match.tp}</td>
        <td data-sort="fc" data-value="${match.fc}" ${match.fc === maxValues.fc ? 'class="max-value"' : ''}>${match.fc}</td>
        <td data-sort="va" data-value="${match.va}" ${match.va === maxValues.va ? 'class="max-value"' : ''}>${match.va}</td>
        <td data-sort="pm" data-value="${match.pm}" ${match.pm === maxValues.pm ? 'class="max-value"' : ''}>${match.pm}</td>
        <td data-sort="imp" data-value="${impact}">${impact}</td>
      `;
      tbody.appendChild(matchRow);
    });
    
    detailsTable.appendChild(thead);
    detailsTable.appendChild(tbody);
    detailsCell.appendChild(detailsTable);
    detailsRow.appendChild(detailsCell);
    row.parentNode.insertBefore(detailsRow, row.nextSibling);

    // Marcar visualmente la columna de fecha como ordenada ascendentemente
    const dateHeader = thead.querySelector('th[data-sort="date"]');
    dateHeader.classList.add('sorted-asc');
  }
}

function sortByColumn(colKey) {
  if (currentSortCol === colKey) {
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
  } else {
    currentSortCol = colKey;
    currentSortOrder = "desc";
  }

  const modeToggle = document.getElementById("modeToggle");
  allPlayersStats = sortArray(
    allPlayersStats,
    colKey,
    currentSortOrder,
    modeToggle.checked ? "promedios" : "totales"
  );

  highlightSortedColumn(colKey);
  applyFilters();
}

function sortArray(array, colKey, order, mode) {
  const numericCols = [
    "min", "pts", "t2c", "t2i", "pct2", "t3c", "t3i", "pct3", "tlc", "tli", "pctTl",
    "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm", "games", "+/-"
  ];

  return [...array].sort((a, b) => {
    let aValue = getSortValue(a, colKey, mode);
    let bValue = getSortValue(b, colKey, mode);

    if (numericCols.includes(colKey)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    // LOG para depuración
    if (["pct2", "pct3", "pctTl", "t2c", "t2i", "t3c", "t3i", "tlc", "tli", "pts", "min", "ro", "rd", "rt", "as", "br", "bp", "tp", "fc", "va", "pm"].includes(colKey)) {
      console.log(`ORDENANDO POR ${colKey}:`, aValue, bValue, "| RAW:", getSortValue(a, colKey, mode), getSortValue(b, colKey, mode));
    }

    if (order === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
}

function getSortValue(obj, colKey, mode) {
  // Caso especial para minutos
  if (colKey === 'min') {
    return obj.seconds;  // Usamos los segundos directamente para ordenar
  }

  // Forzar conversión a número para porcentajes
  if (['pct2', 'pct3', 'pctTl'].includes(colKey)) {
    if (mode === "promedios" && obj.games > 0) {
      // Si es promedio, calcula el porcentaje promedio
      return obj[colKey] ? parseFloat(obj[colKey]) : 0;
    }
    return obj[colKey] ? parseFloat(obj[colKey]) : 0;
  }

  if (mode === "promedios" && obj.games > 0) {
    if (colKey === 'min') {
      return obj.seconds / obj.games;  // Para promedios también usamos segundos
    }
    return obj[colKey] / obj.games;
  }

  if (colKey === 'imp') {
    const minutes = parseInt(secondsToMinutes(obj.seconds).split(':')[0]);
    return minutes > 0 ? (obj.va + obj.pm) / minutes : 0;
  }

  return obj[colKey];
}

function highlightSortedColumn(colKey) {
  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.col === colKey) {
      th.classList.add(currentSortOrder === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });
}

function updatePaginationInfo(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

/***************************************
 * Inicialización
 ***************************************/
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // El loader ya está visible por defecto
        await loadAllStats();
        // Ordenar por puntos totales descendente al cargar
        currentSortCol = "pts";
        currentSortOrder = "desc";
        applyFilters();
        // Ocultamos el loader cuando todo está cargado
        document.querySelector('.loader-container').classList.add('loader-hidden');
    } catch (error) {
        console.error('Error loading statistics:', error);
        document.querySelector('.loader-text').textContent = 'Error al cargar los datos. Por favor, recarga la página.';
    }
});

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupMobileColumns();

  document.getElementById("btnApplyFilters").addEventListener("click", () => {
    currentPage = 1;
    applyFilters();
  });

  const ths = document.querySelectorAll("#statsTable thead th");
  ths.forEach(th => {
    th.addEventListener("click", () => {
      const colKey = th.dataset.col;
      if (colKey) {
        sortByColumn(colKey);
      }
    });
  });

  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });
  }

  const searchInput = document.getElementById("searchPlayerTeam");
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    currentPage++;
    applyFilters();
  });
}); 
