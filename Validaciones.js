/**
 * ═══════════════════════════════════════════════════
 *  Librería CBTis 198 — Validaciones y utilidades
 *  Archivo: Validaciones.js  (V mayúscula — importante en Linux)
 *
 *  v3.1 — Correcciones aplicadas:
 *    · validarFilaImportacion: eliminada clave duplicada 'Año'
 * ═══════════════════════════════════════════════════
 */

"use strict";

/* ══════════════════════════════
   VALIDACIONES DE FORMULARIO
══════════════════════════════ */

/**
 * Valida el formulario de alta de libro.
 * @param {Object} datos - Campos del formulario
 * @returns {{ ok: boolean, msg: string }}
 */
export function validarAlta({ title, author, year }) {
  if (!title || title.trim() === '')
    return { ok: false, msg: 'El título es obligatorio.' };

  if (!author || author.trim() === '')
    return { ok: false, msg: 'El autor es obligatorio.' };

  const maxYear = new Date().getFullYear() + 1;
  const y = parseInt(year);
  if (isNaN(y) || y < 1800 || y > maxYear)
    return { ok: false, msg: `El año debe estar entre 1800 y ${maxYear}.` };

  return { ok: true, msg: '' };
}

/**
 * Valida el formulario de préstamo.
 * @param {Object} datos - Campos del modal de préstamo
 * @returns {{ ok: boolean, msg: string }}
 */
export function validarPrestamo({ student, control, dueDate }) {
  if (!student || student.trim() === '')
    return { ok: false, msg: 'El nombre del alumno es obligatorio.' };

  if (!control || !/^\d{14}$/.test(control.trim()))
    return { ok: false, msg: 'El número de control debe tener exactamente 14 dígitos.' };

  if (!dueDate)
    return { ok: false, msg: 'La fecha de devolución es obligatoria.' };

  const hoy      = new Date(new Date().toDateString());
  const devolver = new Date(dueDate);
  if (devolver <= hoy)
    return { ok: false, msg: 'La fecha de devolución debe ser posterior a hoy.' };

  return { ok: true, msg: '' };
}

/**
 * Valida una renovación de préstamo.
 * La nueva fecha debe ser posterior a la fecha de devolución actual.
 * @param {string} nuevaFecha - YYYY-MM-DD
 * @param {string} fechaActual - YYYY-MM-DD (dueDate actual)
 * @returns {{ ok: boolean, msg: string }}
 */
export function validarRenovacion({ nuevaFecha, fechaActual }) {
  if (!nuevaFecha)
    return { ok: false, msg: 'Selecciona una nueva fecha de devolución.' };

  const hoy    = new Date(new Date().toDateString());
  const nueva  = new Date(nuevaFecha);
  const actual = new Date(fechaActual || new Date().toDateString());

  if (nueva < hoy)
    return { ok: false, msg: 'La nueva fecha debe ser igual o posterior a hoy.' };

  if (nuevaFecha === fechaActual)
    return { ok: false, msg: 'La nueva fecha debe ser diferente a la fecha actual.' };

  return { ok: true, msg: '' };
}

/**
 * Valida una fila de Excel para importación masiva.
 * @param {Object} row - { title, author, year, genre, isbn, copies, multaDiaria }
 * @param {number} rowIndex - Número de fila (para mensajes de error)
 * @returns {{ ok: boolean, msg: string, data: Object|null }}
 */
export function validarFilaImportacion(row, rowIndex) {
  const title  = String(row['Título'] || row['Titulo'] || row['title'] || '').trim();
  const author = String(row['Autor']  || row['author'] || '').trim();
  // CORRECCIÓN: se eliminó la clave 'Año' duplicada
  const year   = parseInt(row['Año']  || row['year'] || 0);
  const genre  = String(row['Género'] || row['Genero'] || row['genre'] || 'General').trim();
  const isbn   = String(row['ISBN']   || row['isbn'] || '').trim();
  const copies = parseInt(row['Ejemplares'] || row['copies'] || 1);
  const multa  = parseFloat(row['Multa/día'] || row['Multa'] || row['multaDiaria'] || 2);

  if (!title)
    return { ok: false, msg: `Fila ${rowIndex}: Título vacío.`, data: null };
  if (!author)
    return { ok: false, msg: `Fila ${rowIndex}: Autor vacío en "${title}".`, data: null };

  const maxYear = new Date().getFullYear() + 1;
  if (!year || year < 1800 || year > maxYear)
    return { ok: false, msg: `Fila ${rowIndex}: Año inválido en "${title}".`, data: null };

  return {
    ok: true, msg: '',
    data: {
      title, author, year,
      genre: genre || 'General',
      isbn: isbn || '',
      copies: isNaN(copies) || copies < 1 ? 1 : copies,
      multaDiaria: isNaN(multa) || multa < 0 ? 2 : multa,
      status: 'disponible',
    }
  };
}

/**
 * Verifica si un alumno ya alcanzó el límite de préstamos.
 * @param {Array}  books   - Array global de libros
 * @param {string} control - Número de control del alumno
 * @param {string} [excludeId] - firebaseId a excluir del conteo
 * @returns {boolean}
 */
export function limiteAlcanzado(books, control, excludeId = '') {
  const activos = books.filter(
    b => b.status === 'prestado'
      && b.loanControl === control
      && b.firebaseId  !== excludeId
  );
  return activos.length >= 3;
}

/**
 * Valida que el color sea un valor CSS reconocido.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidColor(str) {
  const s = new Option().style;
  s.color = str;
  return s.color !== '';
}

/* ══════════════════════════════
   CÁLCULOS DE MULTAS Y FECHAS
══════════════════════════════ */

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD.
 * @returns {string}
 */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Determina si un libro está vencido.
 * @param {Object} book
 * @returns {boolean}
 */
export function isOverdue(book) {
  if (book.status !== 'prestado' || !book.loanDueDate) return false;
  return new Date(book.loanDueDate) < new Date(new Date().toDateString());
}

/**
 * Calcula los días de retraso de un préstamo vencido.
 * @param {Object} book
 * @returns {number}
 */
export function diasVencido(book) {
  if (!isOverdue(book)) return 0;
  const due = new Date(book.loanDueDate);
  const now = new Date(new Date().toDateString());
  return Math.floor((now - due) / 86_400_000);
}

/**
 * Calcula los días que faltan para que venza un préstamo activo.
 * Devuelve un número negativo si ya venció.
 * @param {Object} book
 * @returns {number}
 */
export function diasParaVencer(book) {
  if (book.status !== 'prestado' || !book.loanDueDate) return Infinity;
  const due = new Date(book.loanDueDate);
  const now = new Date(new Date().toDateString());
  return Math.ceil((due - now) / 86_400_000);
}

/**
 * Clasifica la urgencia de vencimiento de un préstamo.
 * @param {Object} book
 * @returns {'overdue'|'urgent'|'soon'|'ok'|'none'}
 *   overdue = ya venció
 *   urgent  = vence hoy o mañana
 *   soon    = vence en 2-3 días
 *   ok      = más de 3 días
 *   none    = no está prestado
 */
export function estadoVencimiento(book) {
  if (book.status !== 'prestado') return 'none';
  const dias = diasParaVencer(book);
  if (dias < 0)  return 'overdue';
  if (dias <= 1) return 'urgent';
  if (dias <= 3) return 'soon';
  return 'ok';
}

/**
 * Calcula la multa total de un libro vencido.
 * @param {Object} book
 * @returns {string} - Monto con dos decimales
 */
export function calcMulta(book) {
  return (diasVencido(book) * (book.multaDiaria || 2)).toFixed(2);
}

/**
 * Cuenta copias disponibles de un mismo título
 * (comparación insensible a mayúsculas y espacios extra).
 * @param {Array}  books
 * @param {Object} book
 * @returns {{ disponibles: number, total: number }}
 */
export function copiasDisponibles(books, book) {
  const normalizar = s => (s || '').trim().toLowerCase();
  // Preferir comparación por ISBN si está disponible (más precisa)
  const grupo = book.isbn
    ? books.filter(b => b.isbn && normalizar(b.isbn) === normalizar(book.isbn))
    : books.filter(b => normalizar(b.title) === normalizar(book.title));
  return {
    disponibles: grupo.filter(b => b.status === 'disponible').length,
    total:       grupo.length,
  };
}

/* ══════════════════════════════
   RENDERERS COMPARTIDOS
   (Elimina duplicación entre Index.html y admin.html)
══════════════════════════════ */

/**
 * Genera el HTML de una lista de items de historial.
 * @param {Array} items - Registros de loanHistory ya filtrados
 * @returns {string} HTML
 */
export function renderHistorialItems(items) {
  if (!items.length)
    return '<p style="color:var(--muted);font-size:.9rem;">Sin registros.</p>';

  return items.map(h => `
    <div class="history-item">
      <div class="hi-icon">${h.action === 'prestado' ? '📤' : '📥'}</div>
      <div class="hi-body">
        <strong>${esc(h.bookTitle)}</strong> — ${h.action === 'prestado' ? 'Prestado' : 'Devuelto'}
        <br><span style="color:var(--muted)">👤 ${esc(h.student)} · ${esc(h.control)}</span>
        ${h.action === 'prestado'
          ? `<br><span style="color:var(--muted)">📅 Dev: ${h.dueDate || '—'}</span>`
          : ''}
        ${h.multaCobrada && h.multaCobrada !== '0.00'
          ? `<br><span style="color:var(--danger)">💰 Multa: $${h.multaCobrada}</span>`
          : ''}
      </div>
      <div class="hi-date">${h.action === 'prestado' ? h.loanDate || '' : h.returnDate || ''}</div>
    </div>`).join('');
}

/**
 * Genera el HTML de la lista de multas activas.
 * @param {Array} books - Array global de libros
 * @returns {string} HTML
 */
export function renderMultasItems(books) {
  const vencidos = books.filter(b => isOverdue(b));
  if (!vencidos.length)
    return '<p style="color:var(--success);font-size:.9rem;">✅ Sin préstamos vencidos.</p>';

  return vencidos.map(b => `
    <div class="multa-item">
      <div class="multa-meta">
        <strong>${esc(b.title)}</strong>
        <span>👤 ${esc(b.loanStudent)} · ${esc(b.loanControl)}</span>
        <span>📅 Venció: ${b.loanDueDate} · ${diasVencido(b)} días · $${b.multaDiaria || 2}/día</span>
      </div>
      <div class="multa-amount">$${calcMulta(b)}</div>
    </div>`).join('');
}

/**
 * Genera el HTML del resumen de un alumno (consulta alumno).
 * @param {Array}  books
 * @param {Array}  loanHistory
 * @param {string} query - Texto de búsqueda
 * @returns {string} HTML
 */
export function buildResumenAlumno(books, loanHistory, query) {
  const q = query.trim().toLowerCase();
  if (!q) return '';

  const prestados  = books.filter(b =>
    b.status === 'prestado' &&
    (b.loanStudent?.toLowerCase().includes(q) || b.loanControl?.toLowerCase().includes(q))
  );
  const histAlumno = loanHistory.filter(h =>
    h.student?.toLowerCase().includes(q) || h.control?.toLowerCase().includes(q)
  );

  if (!prestados.length && !histAlumno.length)
    return '<div class="alumno-result"><div class="ar-title" style="color:var(--muted)">Sin resultados.</div></div>';

  const datos  = prestados[0] || histAlumno[0];
  const nombre = datos?.loanStudent || datos?.student || '—';
  const ctrl   = datos?.loanControl || datos?.control || '—';

  return `
    <div class="alumno-result">
      <div class="ar-title">👤 ${esc(nombre)} · ${esc(ctrl)}</div>
      <div style="margin-top:.5rem;font-weight:500;font-size:.85rem;color:var(--accent);">
        Libros prestados actualmente (${prestados.length}/3):
      </div>
      ${prestados.length === 0
        ? '<div class="ar-item">— Ninguno actualmente —</div>'
        : prestados.map(b => {
            const ov  = isOverdue(b);
            const ev  = estadoVencimiento(b);
            const tag = ev === 'urgent' ? ' 🔔 Vence pronto' : ev === 'soon' ? ' ⏰ Vence en breve' : '';
            return `<div class="ar-item">${ov ? '⚠️' : '📖'}
              <strong>${esc(b.title)}</strong> · Devolver: ${esc(b.loanDueDate)}${tag}
              ${ov ? ` · <span style="color:var(--danger)">Multa: $${calcMulta(b)}</span>` : ''}
            </div>`;
          }).join('')
      }
      <div style="margin-top:.75rem;font-weight:500;font-size:.85rem;color:var(--accent);">
        Historial (${histAlumno.length} registros):
      </div>
      ${histAlumno.slice(0, 10).map(h => `
        <div class="ar-item">
          ${h.action === 'prestado' ? '📤' : '📥'}
          ${esc(h.bookTitle)} · ${h.action === 'prestado' ? esc(h.loanDate) : esc(h.returnDate)}
        </div>`).join('')}
    </div>`;
}

/* ══════════════════════════════
   UTILIDADES DE SEGURIDAD / UI
══════════════════════════════ */

/**
 * Escapa caracteres HTML para prevenir XSS.
 * Usar siempre al insertar datos del usuario en el DOM via innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Convierte un color CSS (rgb, nombre) a formato hexadecimal.
 * @param {string} color
 * @returns {string|null}
 */
export function rgbToHex(color) {
  const d = document.createElement('div');
  d.style.color = color;
  document.body.appendChild(d);
  const rgb = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return null;
  return '#' + m.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Muestra u oculta el estado de carga en un botón.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string}  text    - Texto original del botón
 */
export function setBtnLoading(btn, loading, text) {
  btn.disabled = loading;
  if (loading) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    btn.innerHTML = '';
    btn.appendChild(spinner);
    btn.appendChild(document.createTextNode(' ' + text));
  } else {
    btn.textContent = text;
  }
}

/**
 * Muestra el toast de notificación.
 * @param {string} msg
 * @param {'ok'|'err'|'warn'} type
 * @param {number} ms  - Duración en milisegundos
 */
export function showToast(msg, type = 'ok', ms = 3200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), ms);
}

/**
 * Abre un modal de confirmación personalizado (reemplaza confirm() nativo).
 * Devuelve una Promise<boolean>.
 * @param {string} mensaje
 * @param {string} [btnTexto='Confirmar']
 * @param {'danger'|'warn'} [tipo='danger']
 * @returns {Promise<boolean>}
 */
export function confirmar(mensaje, btnTexto = 'Confirmar', tipo = 'danger') {
  return new Promise(resolve => {
    let overlay = document.getElementById('confirmModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id        = 'confirmModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal confirm-modal" style="max-width:380px;text-align:center;">
          <p id="confirmMsg" style="font-size:.95rem;margin-bottom:1.5rem;line-height:1.5;"></p>
          <div class="modal-actions" style="justify-content:center;">
            <button class="btn-cancel"  id="confirmNo">Cancelar</button>
            <button class="btn-danger"  id="confirmYes"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    document.getElementById('confirmMsg').textContent  = mensaje;
    const yesBtn = document.getElementById('confirmYes');
    yesBtn.textContent  = btnTexto;
    yesBtn.className    = tipo === 'warn' ? 'btn-warn' : 'btn-danger';

    overlay.classList.add('visible');

    const cleanup = (result) => {
      overlay.classList.remove('visible');
      yesBtn.replaceWith(yesBtn.cloneNode(true));
      document.getElementById('confirmNo').replaceWith(
        document.getElementById('confirmNo').cloneNode(true)
      );
      resolve(result);
    };

    // Re-query after cloneNode
    setTimeout(() => {
      document.getElementById('confirmYes').addEventListener('click', () => cleanup(true),  { once: true });
      document.getElementById('confirmNo').addEventListener('click',  () => cleanup(false), { once: true });
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); }, { once: true });
    }, 0);
  });
}
