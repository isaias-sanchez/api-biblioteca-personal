/* =============================================
   API Biblioteca Personal — Frontend
   ============================================= */
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';   // En producción la API está en el mismo origen

// Estado global
let allBooks    = [];
let currentView = 'estantes';
let activeEstado = '';
let selectedStars = 0;
let editingId    = null;

// Paleta de colores para los lomos de libros (tema biblioteca)
const SPINE_COLORS = [
  ['#8B1A1A','#A52020'],  // rojo cuero
  ['#1A3A5C','#254F7A'],  // azul marino
  ['#2D5016','#3D6B1F'],  // verde biblioteca
  ['#4A1A6B','#632392'],  // púrpura
  ['#1A5C4A','#247A62'],  // teal
  ['#6B3E0A','#8B5212'],  // marrón ámbar
  ['#1A1A5C','#252578'],  // azul índigo
  ['#5C1A2D','#7A2540'],  // granate
  ['#3A3A1A','#52521F'],  // oliva
  ['#1A4A5C','#226480'],  // azul pizarra
];

const spineColor = (id) => SPINE_COLORS[id % SPINE_COLORS.length];
const spineWidth = () => Math.floor(Math.random() * 18) + 22; // 22–40px

// Altura basada en páginas o aleatoria
const spineHeight = (paginas) => {
  if (paginas) return Math.min(180, Math.max(110, 90 + paginas / 6));
  return Math.floor(Math.random() * 60) + 110;
};

const stars = (n, max = 5) => {
  if (!n) return '<span style="opacity:0.3">☆☆☆☆☆</span>';
  return '★'.repeat(n) + '<span style="opacity:0.3">' + '★'.repeat(max - n) + '</span>';
};

const estadoLabel = { pendiente: '📌 Pendiente', leyendo: '📖 Leyendo', leido: '✅ Leído' };

// ── Fetch helpers ─────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ── Cargar todos los libros ────────────────────────────────────────
async function loadBooks() {
  try {
    const data = await apiFetch('/libros');
    allBooks = data.libros || [];
    render();
  } catch (e) {
    showToast('No se pudo conectar con la API', 'error');
  }
}

// ── Filtrar libros ─────────────────────────────────────────────────
function filteredBooks() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const normalize = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const qn = normalize(q);
  return allBooks.filter(b => {
    const estadoOk = !activeEstado || b.estado === activeEstado;
    const searchOk = !q ||
      normalize(b.titulo).includes(qn) ||
      normalize(b.autor).includes(qn);
    return estadoOk && searchOk;
  });
}

// ── Render principal ───────────────────────────────────────────────
function render() {
  if (currentView === 'estantes') renderEstantes();
  if (currentView === 'lista')    renderLista();
  if (currentView === 'stats')    renderStats();
}

// ── VISTA ESTANTES ─────────────────────────────────────────────────
function renderEstantes() {
  const room = document.getElementById('shelfRoom');
  const books = filteredBooks();
  if (!books.length) {
    room.innerHTML = `
      <div class="empty-shelf">
        <div class="empty-icon">📭</div>
        <h3>Estantes vacíos</h3>
        <p>Agrega tu primer libro con el botón superior</p>
      </div>`;
    return;
  }

  const BOOKS_PER_SHELF = 12;
  const shelves = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    shelves.push(books.slice(i, i + BOOKS_PER_SHELF));
  }

  room.innerHTML = shelves.map((shelf, si) => `
    <div class="shelf">
      <span class="shelf-label">Estante ${si + 1}</span>
      ${shelf.map(b => buildSpine(b)).join('')}
    </div>
  `).join('');

  // Eventos en tooltips
  room.querySelectorAll('.tt-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEdit(+btn.dataset.id);
    });
  });
  room.querySelectorAll('.tt-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBook(+btn.dataset.id, btn.dataset.titulo);
    });
  });
}

function buildSpine(b) {
  const [bg1, bg2] = spineColor(b.id);
  const w = spineWidth();
  const h = spineHeight(b.paginas);
  const badge = `<span class="spine-badge badge-${b.estado}"></span>`;
  const ttStars = b.calificacion ? '★'.repeat(b.calificacion) : 'Sin calificar';
  const ttColor = b.estado === 'leido' ? '#81C784' : b.estado === 'leyendo' ? '#E8B84B' : '#9E9E9E';

  return `
    <div class="book-spine"
         style="width:${w}px;height:${h}px;background:linear-gradient(90deg,${bg1},${bg2});">
      ${badge}
      <span class="spine-title">${b.titulo}</span>
      <span class="spine-autor">${b.autor}</span>
      <div class="spine-tooltip">
        <div class="tt-title">${b.titulo}</div>
        <div class="tt-author">${b.autor}</div>
        <div class="tt-meta">
          <span>${b.genero}</span>
          ${b.anio ? `<span>${b.anio}</span>` : ''}
          ${b.paginas ? `<span>${b.paginas} pág.</span>` : ''}
        </div>
        <div class="tt-estado" style="color:${ttColor}">${estadoLabel[b.estado]}</div>
        <div style="color:#E8B84B;font-size:0.78rem;margin-top:4px">${ttStars}</div>
        <div class="tt-actions">
          <button class="tt-edit" data-id="${b.id}" data-titulo="${b.titulo}">✏️ Editar</button>
          <button class="tt-delete" data-id="${b.id}" data-titulo="${b.titulo}">🗑️ Eliminar</button>
        </div>
      </div>
    </div>`;
}

// ── VISTA LISTA ────────────────────────────────────────────────────
function renderLista() {
  const tbody = document.getElementById('tableBody');
  const books = filteredBooks();
  if (!books.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;opacity:0.5">
      No hay libros para mostrar</td></tr>`;
    return;
  }
  tbody.innerHTML = books.map(b => `
    <tr>
      <td><strong style="font-family:'Playfair Display',serif">${b.titulo}</strong>
          ${b.notas ? `<br><small style="opacity:0.55;font-style:italic">${b.notas.slice(0,60)}${b.notas.length>60?'…':''}</small>` : ''}
      </td>
      <td>${b.autor}</td>
      <td><span style="opacity:0.8">${b.genero}</span></td>
      <td>${b.anio || '—'}</td>
      <td><span class="estado-tag estado-${b.estado}">${estadoLabel[b.estado]}</span></td>
      <td><span class="stars-display">${stars(b.calificacion)}</span></td>
      <td>
        <div class="tbl-actions">
          <button class="btn-tbl-edit" onclick="openEdit(${b.id})">Editar</button>
          <button class="btn-tbl-delete" onclick="deleteBook(${b.id},'${b.titulo.replace(/'/g,"\\'")}')">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── VISTA STATS ────────────────────────────────────────────────────
async function renderStats() {
  const grid = document.getElementById('statsGrid');
  try {
    const s = await apiFetch('/stats');
    const total = s.total_libros;
    const maxGenero = Math.max(...(s.por_genero.map(g => g.cantidad)), 1);

    grid.innerHTML = `
      <!-- Total -->
      <div class="stat-card">
        <h3>📚 Colección total</h3>
        <div class="stat-big">${total}</div>
        <div class="stat-label">${total === 1 ? 'libro en tu biblioteca' : 'libros en tu biblioteca'}</div>
      </div>

      <!-- Por estado -->
      <div class="stat-card">
        <h3>📊 Por estado de lectura</h3>
        ${s.por_estado.map(e => `
          <div class="bar-row">
            <span class="bar-name">${estadoLabel[e.estado] || e.estado}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${total ? (e.cantidad/total*100) : 0}%"></div>
            </div>
            <span class="bar-count">${e.cantidad}</span>
          </div>`).join('')}
      </div>

      <!-- Por género -->
      <div class="stat-card">
        <h3>🏷️ Por género</h3>
        ${s.por_genero.slice(0,6).map(g => `
          <div class="bar-row">
            <span class="bar-name">${g.genero}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${(g.cantidad/maxGenero*100)}%"></div>
            </div>
            <span class="bar-count">${g.cantidad}</span>
          </div>`).join('')}
      </div>

      <!-- Mejor calificados -->
      <div class="stat-card">
        <h3>⭐ Mejor calificados</h3>
        ${s.calificacion_promedio
          ? `<div style="margin-bottom:16px">
               <span class="stat-big" style="font-size:2.2rem">${s.calificacion_promedio}</span>
               <span style="color:var(--gold);font-size:1.2rem;margin-left:6px">★</span>
               <div class="stat-label">calificación promedio</div>
             </div>` : ''}
        <ul class="top-list">
          ${s.mejores_calificados.map((b,i) => `
            <li>
              <span class="top-num">${i+1}</span>
              <div class="top-info">
                <div class="top-title">${b.titulo}</div>
                <div class="top-author">${b.autor}</div>
              </div>
              <span class="top-stars">${'★'.repeat(b.calificacion)}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  } catch (e) {
    grid.innerHTML = `<div class="stat-loading">Error cargando estadísticas</div>`;
  }
}

// ── MODAL ──────────────────────────────────────────────────────────
function openModal(titulo = 'Agregar libro') {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('bookForm').reset();
  document.getElementById('bookId').value = '';
  editingId = null;
  selectedStars = 0;
  updateStars(0);
}

function openEdit(id) {
  const b = allBooks.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('bookId').value   = id;
  document.getElementById('fTitulo').value  = b.titulo;
  document.getElementById('fAutor').value   = b.autor;
  document.getElementById('fGenero').value  = b.genero;
  document.getElementById('fAnio').value    = b.anio || '';
  document.getElementById('fPaginas').value = b.paginas || '';
  document.getElementById('fEstado').value  = b.estado;
  document.getElementById('fNotas').value   = b.notas || '';
  selectedStars = b.calificacion || 0;
  document.getElementById('fCalificacion').value = selectedStars;
  updateStars(selectedStars);
  openModal('Editar libro');
}

// Estrellas
function updateStars(n) {
  document.querySelectorAll('.star-input .star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}
document.querySelectorAll('.star-input .star').forEach(s => {
  s.addEventListener('mouseenter', () => updateStars(+s.dataset.val));
  s.addEventListener('mouseleave', () => updateStars(selectedStars));
  s.addEventListener('click', () => {
    selectedStars = +s.dataset.val;
    document.getElementById('fCalificacion').value = selectedStars;
    updateStars(selectedStars);
  });
});

// Submit form
document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    titulo:       document.getElementById('fTitulo').value.trim(),
    autor:        document.getElementById('fAutor').value.trim(),
    genero:       document.getElementById('fGenero').value.trim(),
    anio:         +document.getElementById('fAnio').value || null,
    paginas:      +document.getElementById('fPaginas').value || null,
    estado:       document.getElementById('fEstado').value,
    calificacion: selectedStars || null,
    notas:        document.getElementById('fNotas').value.trim() || null,
  };
  try {
    if (editingId) {
      await apiFetch(`/libros/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast(`"${payload.titulo}" actualizado ✓`, 'success');
    } else {
      await apiFetch('/libros', { method: 'POST', body: JSON.stringify(payload) });
      showToast(`"${payload.titulo}" agregado a tu biblioteca ✓`, 'success');
    }
    closeModal();
    loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ── DELETE ────────────────────────────────────────────────────────
async function deleteBook(id, titulo) {
  if (!confirm(`¿Eliminar "${titulo}" de tu biblioteca?`)) return;
  try {
    await apiFetch(`/libros/${id}`, { method: 'DELETE' });
    showToast(`"${titulo}" eliminado`, 'success');
    loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentView = pill.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${currentView}`).classList.add('active');
    render();
  });
});

// Filtros
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeEstado = chip.dataset.estado;
    render();
  });
});

let searchTimer;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 280);
});

// Modal open/close
document.getElementById('btnOpenModal').addEventListener('click', () => openModal('Agregar libro'));
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Exponer globalmente para los onclick inline de la tabla
window.openEdit   = openEdit;
window.deleteBook = deleteBook;

// ── INIT ──────────────────────────────────────────────────────────
loadBooks();
