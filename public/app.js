/* =============================================
   API Biblioteca Personal — App
   ============================================= */
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000' : '';

// ── Estado ────────────────────────────────────
let allBooks    = [];
let activeEstado = '';
let currentView  = 'estantes';
let selectedStars = 0;
let editingId    = null;
let activeBookId = null;

// Paleta de lomos: [fondo1, fondo2]
const PALETTES = [
  ['#5C1A2D','#7A2540'], ['#1A3A5C','#254F7A'], ['#2D5016','#3D6B1F'],
  ['#4A1A6B','#632392'], ['#1A5C4A','#247A62'], ['#7A3A0A','#9B5215'],
  ['#1A1A5C','#252578'], ['#5C3A0A','#7A5015'], ['#3A1A5C','#4E2578'],
  ['#0A3A5C','#155078'], ['#5C1A1A','#7A2020'], ['#1A5C1A','#207A20'],
];

const palette    = (id) => PALETTES[id % PALETTES.length];
const spineW     = (paginas) => Math.min(48, Math.max(22, paginas ? Math.floor(paginas / 20) + 18 : 28));
const spineH     = (paginas) => Math.min(190, Math.max(120, paginas ? Math.floor(paginas / 4) + 100 : 145));
const starsHtml  = (n, max=5) => n ? '★'.repeat(n) + '<span style="opacity:.2">' + '★'.repeat(max-n) + '</span>' : '<span style="opacity:.2">★★★★★</span>';
const ESTADO_MAP = { leido: '✅ Leído', leyendo: '📖 Leyendo', pendiente: '📌 Pendiente' };

// ── Helpers fetch ─────────────────────────────
async function apiFetch(path, opts={}) {
  const res  = await fetch(API + path, { headers:{'Content-Type':'application/json'}, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}

// ── Toast ─────────────────────────────────────
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 3000);
}

// ── Cargar libros ─────────────────────────────
async function loadBooks() {
  try {
    const data = await apiFetch('/libros');
    allBooks = data.libros || [];
    updateCounts();
    render();
  } catch { toast('No se pudo conectar con la API', 'error'); }
}

// ── Filtrado ──────────────────────────────────
function filtered() {
  const raw = document.getElementById('searchInput').value.trim();
  const q   = norm(raw);
  return allBooks.filter(b => {
    const byEstado = !activeEstado || b.estado === activeEstado;
    const bySearch = !q || norm(b.titulo).includes(q) || norm(b.autor).includes(q) || norm(b.genero).includes(q);
    return byEstado && bySearch;
  });
}
const norm = s => (s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

function updateCounts() {
  const cnt = (estado) => allBooks.filter(b => !estado || b.estado === estado).length;
  document.getElementById('countAll').textContent      = cnt('');
  document.getElementById('countLeido').textContent    = cnt('leido');
  document.getElementById('countLeyendo').textContent  = cnt('leyendo');
  document.getElementById('countPendiente').textContent= cnt('pendiente');
}

function updateTopbar() {
  const books = filtered();
  const info  = document.getElementById('topbarInfo');
  info.textContent = `${books.length} ${books.length === 1 ? 'libro' : 'libros'}${activeEstado ? ` · ${ESTADO_MAP[activeEstado]}` : ''}`;
}

// ── Render ────────────────────────────────────
function render() {
  updateTopbar();
  if (currentView === 'estantes') renderEstantes();
  if (currentView === 'lista')    renderLista();
  if (currentView === 'stats')    renderStats();
}

// ── ESTANTES ──────────────────────────────────
function renderEstantes() {
  const room  = document.getElementById('shelfRoom');
  const books = filtered();
  if (!books.length) {
    room.innerHTML = `<div class="empty-state"><div class="ei">📭</div><h3>Estantes vacíos</h3><p>Agrega tu primer libro con el botón de la barra lateral</p></div>`;
    return;
  }
  const PER_SHELF = 14;
  const shelves   = [];
  for (let i = 0; i < books.length; i += PER_SHELF) shelves.push(books.slice(i, i + PER_SHELF));

  room.innerHTML = shelves.map((sh, si) => `
    <div class="shelf">
      <span class="shelf-tag">Estante ${si + 1}</span>
      ${sh.map(b => spineEl(b)).join('')}
    </div>`).join('');

  room.querySelectorAll('.book-spine').forEach(el => {
    el.addEventListener('click', () => openDetail(+el.dataset.id));
  });
}

function spineEl(b) {
  const [c1,c2] = palette(b.id);
  const w = spineW(b.paginas), h = spineH(b.paginas);
  const isSel = b.id === activeBookId ? ' selected' : '';
  return `<div class="book-spine${isSel}" data-id="${b.id}"
    style="width:${w}px;height:${h}px;background:linear-gradient(90deg,${c1},${c2})">
    <span class="spine-status ${b.estado}"></span>
    <span class="spine-title">${b.titulo}</span>
    <span class="spine-autor">${b.autor}</span>
  </div>`;
}

// ── LISTA (cards) ──────────────────────────────
function renderLista() {
  const grid  = document.getElementById('listGrid');
  const books = filtered();
  if (!books.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🔍</div><h3>Sin resultados</h3><p>Prueba con otro término o estado</p></div>`;
    return;
  }
  grid.innerHTML = books.map(b => `
    <div class="book-card ${b.estado}" data-id="${b.id}">
      <div class="card-genre">${b.genero}</div>
      <div class="card-title">${b.titulo}</div>
      <div class="card-author">${b.autor}${b.anio ? ` · ${b.anio}` : ''}</div>
      <div class="card-footer">
        <span class="card-tag ${b.estado}">${ESTADO_MAP[b.estado]}</span>
        <span class="card-stars">${starsHtml(b.calificacion)}</span>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.book-card').forEach(el => {
    el.addEventListener('click', () => openDetail(+el.dataset.id));
  });
}

// ── STATS ──────────────────────────────────────
async function renderStats() {
  const grid = document.getElementById('statsGrid');
  try {
    const s = await apiFetch('/stats');
    const total = s.total_libros;
    const maxG  = Math.max(...s.por_genero.map(g=>g.cantidad), 1);
    grid.innerHTML = `
      <div class="stat-card">
        <h3>📚 Colección total</h3>
        <div class="stat-num">${total}</div>
        <div class="stat-sub">${total === 1 ? 'libro' : 'libros'} en tu biblioteca</div>
      </div>
      <div class="stat-card">
        <h3>📊 Por estado</h3>
        ${s.por_estado.map(e => `
          <div class="bar-row">
            <span class="bar-label">${ESTADO_MAP[e.estado]||e.estado}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${total?(e.cantidad/total*100):0}%"></div></div>
            <span class="bar-count">${e.cantidad}</span>
          </div>`).join('')}
      </div>
      <div class="stat-card">
        <h3>🏷️ Por género</h3>
        ${s.por_genero.slice(0,7).map(g => `
          <div class="bar-row">
            <span class="bar-label">${g.genero}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${g.cantidad/maxG*100}%"></div></div>
            <span class="bar-count">${g.cantidad}</span>
          </div>`).join('')}
      </div>
      <div class="stat-card">
        <h3>⭐ Mejor calificados</h3>
        ${s.calificacion_promedio ? `
          <div style="margin-bottom:16px">
            <span class="stat-num" style="font-size:2.2rem">${s.calificacion_promedio}</span>
            <span style="color:var(--gold-400);font-size:1.1rem;margin-left:4px">★</span>
            <div class="stat-sub">promedio de calificaciones</div>
          </div>` : ''}
        <ul class="top-list">
          ${s.mejores_calificados.map((b,i) => `
            <li>
              <span class="top-num">${i+1}</span>
              <div class="top-info">
                <div class="top-t">${b.titulo}</div>
                <div class="top-a">${b.autor}</div>
              </div>
              <span class="top-s">${'★'.repeat(b.calificacion)}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  } catch { grid.innerHTML = `<div class="empty-state"><div class="ei">⚠️</div><h3>Error cargando estadísticas</h3></div>`; }
}

// ── PANEL DETALLE ──────────────────────────────
function openDetail(id) {
  const b = allBooks.find(x => x.id === id);
  if (!b) return;
  activeBookId = id;

  // Actualizar selección en estante
  document.querySelectorAll('.book-spine').forEach(el => {
    el.classList.toggle('selected', +el.dataset.id === id);
  });

  // Portada
  const [c1, c2] = palette(b.id);
  const cover = document.getElementById('detailCover');
  cover.style.background = `linear-gradient(160deg, ${c1}, ${c2})`;
  document.getElementById('detailCoverTitle').textContent = b.titulo;

  // Info
  document.getElementById('detailTitle').textContent  = b.titulo;
  document.getElementById('detailAuthor').textContent = b.autor;

  const meta = [];
  if (b.genero)  meta.push(b.genero);
  if (b.anio)    meta.push(b.anio);
  if (b.paginas) meta.push(`${b.paginas} páginas`);
  document.getElementById('detailMeta').innerHTML = meta.map(m => `<span class="detail-chip">${m}</span>`).join('');

  // Estado buttons
  document.getElementById('detailEstadoBtns').innerHTML = ['leido','leyendo','pendiente'].map(e => `
    <button class="estado-btn ${b.estado===e ? 'active-'+e : ''}" data-estado="${e}">
      ${e==='leido'?'✅':e==='leyendo'?'📖':'📌'}<br>${e.charAt(0).toUpperCase()+e.slice(1)}
    </button>`).join('');

  document.getElementById('detailEstadoBtns').querySelectorAll('.estado-btn').forEach(btn => {
    btn.addEventListener('click', () => quickEstado(id, btn.dataset.estado));
  });

  // Estrellas
  renderDetailStars(b.calificacion || 0, id);

  // Notas
  const nw = document.getElementById('detailNotesWrap');
  const nt = document.getElementById('detailNotesText');
  if (b.notas) { nw.style.display = 'block'; nt.textContent = b.notas; }
  else { nw.style.display = 'none'; }

  // Botones
  document.getElementById('detailEditBtn').onclick   = () => { closeDetail(); openEdit(id); };
  document.getElementById('detailDeleteBtn').onclick = () => deleteBook(id, b.titulo);

  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('detailOverlay').classList.add('open');
}

function renderDetailStars(current, bookId) {
  const wrap = document.getElementById('detailStars');
  wrap.innerHTML = [1,2,3,4,5].map(n =>
    `<span class="detail-star ${n<=current?'filled':''}" data-n="${n}">★</span>`
  ).join('');
  wrap.querySelectorAll('.detail-star').forEach(s => {
    s.addEventListener('mouseenter', () =>
      wrap.querySelectorAll('.detail-star').forEach((x,i) => x.classList.toggle('filled', i<+s.dataset.n))
    );
    s.addEventListener('mouseleave', () =>
      wrap.querySelectorAll('.detail-star').forEach((x,i) => x.classList.toggle('filled', i<current))
    );
    s.addEventListener('click', () => quickCalificacion(bookId, +s.dataset.n));
  });
}

function closeDetail() {
  activeBookId = null;
  document.querySelectorAll('.book-spine').forEach(el => el.classList.remove('selected'));
  document.getElementById('detailPanel').classList.remove('open');
  document.getElementById('detailOverlay').classList.remove('open');
}

// Quick estado desde panel
async function quickEstado(id, estado) {
  try {
    await apiFetch(`/libros/${id}/estado`, { method:'PATCH', body: JSON.stringify({estado}) });
    toast(`Estado cambiado a "${ESTADO_MAP[estado]}" ✓`);
    await loadBooks();
    openDetail(id); // refrescar panel
  } catch(e) { toast(e.message, 'error'); }
}

// Quick calificación desde panel
async function quickCalificacion(id, calificacion) {
  const b = allBooks.find(x => x.id === id);
  if (!b) return;
  try {
    await apiFetch(`/libros/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ titulo:b.titulo, autor:b.autor, genero:b.genero,
        anio:b.anio, paginas:b.paginas, estado:b.estado,
        calificacion, notas:b.notas })
    });
    toast(`Calificación guardada ${'★'.repeat(calificacion)}`);
    await loadBooks();
    openDetail(id);
  } catch(e) { toast(e.message,'error'); }
}

// ── MODAL ──────────────────────────────────────
function openModal(titulo='Agregar libro') {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('bookForm').reset();
  document.getElementById('bookId').value = '';
  editingId = null; selectedStars = 0; updateFormStars(0);
}
function openEdit(id) {
  const b = allBooks.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  document.getElementById('bookId').value   = id;
  document.getElementById('fTitulo').value  = b.titulo;
  document.getElementById('fAutor').value   = b.autor;
  document.getElementById('fGenero').value  = b.genero;
  document.getElementById('fAnio').value    = b.anio    || '';
  document.getElementById('fPaginas').value = b.paginas || '';
  document.getElementById('fEstado').value  = b.estado;
  document.getElementById('fNotas').value   = b.notas   || '';
  selectedStars = b.calificacion || 0;
  document.getElementById('fCalificacion').value = selectedStars;
  updateFormStars(selectedStars);
  openModal('Editar libro');
}

function updateFormStars(n) {
  document.querySelectorAll('.star-input .star').forEach((s,i) => s.classList.toggle('active', i<n));
}
document.querySelectorAll('.star-input .star').forEach(s => {
  s.addEventListener('mouseenter', () => updateFormStars(+s.dataset.val));
  s.addEventListener('mouseleave', () => updateFormStars(selectedStars));
  s.addEventListener('click', () => {
    selectedStars = +s.dataset.val;
    document.getElementById('fCalificacion').value = selectedStars;
    updateFormStars(selectedStars);
  });
});

document.getElementById('bookForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    titulo:       document.getElementById('fTitulo').value.trim(),
    autor:        document.getElementById('fAutor').value.trim(),
    genero:       document.getElementById('fGenero').value.trim(),
    anio:         +document.getElementById('fAnio').value    || null,
    paginas:      +document.getElementById('fPaginas').value || null,
    estado:       document.getElementById('fEstado').value,
    calificacion: selectedStars || null,
    notas:        document.getElementById('fNotas').value.trim() || null,
  };
  try {
    if (editingId) {
      await apiFetch(`/libros/${editingId}`, { method:'PUT', body:JSON.stringify(payload) });
      toast(`"${payload.titulo}" actualizado ✓`);
    } else {
      await apiFetch('/libros', { method:'POST', body:JSON.stringify(payload) });
      toast(`"${payload.titulo}" agregado ✓`);
    }
    closeModal();
    await loadBooks();
    if (editingId) openDetail(editingId);
  } catch(err) { toast(err.message, 'error'); }
});

// ── DELETE ─────────────────────────────────────
async function deleteBook(id, titulo) {
  if (!confirm(`¿Eliminar "${titulo}" de tu biblioteca?`)) return;
  try {
    await apiFetch(`/libros/${id}`, { method:'DELETE' });
    toast(`"${titulo}" eliminado`);
    closeDetail();
    await loadBooks();
  } catch(err) { toast(err.message,'error'); }
}

// ── NAVEGACIÓN ─────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${currentView}`).classList.add('active');
    closeDetail();
    render();
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeEstado = btn.dataset.estado;
    closeDetail();
    render();
  });
});

// Búsqueda
let searchTimer;
const searchClear = document.getElementById('searchClear');
document.getElementById('searchInput').addEventListener('input', e => {
  searchClear.classList.toggle('hidden', !e.target.value);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { closeDetail(); render(); }, 250);
});
searchClear.addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  searchClear.classList.add('hidden');
  closeDetail(); render();
});

// Modal
document.getElementById('btnOpenModal').addEventListener('click', () => openModal());
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeModal(); });

// Panel detalle
document.getElementById('detailClose').addEventListener('click', closeDetail);
document.getElementById('detailOverlay').addEventListener('click', closeDetail);

// Teclado
document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeModal(); closeDetail(); }
});

// ── INIT ───────────────────────────────────────
loadBooks();
