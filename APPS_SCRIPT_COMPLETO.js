// ============================================================
// APPS SCRIPT COMPLETO — Boda Estiven & Johana
// Pega TODO este código en Extensions → Apps Script
// Reemplaza TU_TOKEN_GITHUB con tu token real
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
const GITHUB_TOKEN  = 'TU_TOKEN_GITHUB';        // ← pega tu token aquí
const GITHUB_USER   = 'Tempest9805';
const GITHUB_REPO   = 'Invitaciones_boda';
const GITHUB_BRANCH = 'main';
const JSON_FILE     = 'invitados.json';
// ────────────────────────────────────────────────────────────

// ============================================================
// 1. RECIBIR RSVP DESDE EL FORMULARIO WEB
// ============================================================
// ⚠️ "Requiere buseta" va AL FINAL a propósito. Si se insertara en
// medio, las filas ya guardadas quedarían desalineadas respecto a la
// cabecera (el Mensaje de las respuestas viejas caería bajo la columna
// nueva). Añadiendo al final, lo histórico se conserva intacto.
const RSVP_HEADERS = [
  'Timestamp', 'ID', 'Nombre', 'Teléfono',
  'Asistencia', 'Cant. Acompañantes', 'Nombres Acompañantes', 'Mensaje',
  'Requiere buseta'
];

function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName('RSVPs');

    if (!sheet) {
      sheet = ss.insertSheet('RSVPs');
      sheet.appendRow(RSVP_HEADERS);
      sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setFontWeight('bold');
    } else if (sheet.getLastColumn() < RSVP_HEADERS.length) {
      // Hoja creada antes de existir la columna de buseta: se completa
      // la cabecera para que la columna nueva no quede sin título.
      const oldLastCol = sheet.getLastColumn();
      const firstNewCol = oldLastCol + 1;
      sheet.getRange(1, firstNewCol, 1, RSVP_HEADERS.length - oldLastCol)
           .setValues([RSVP_HEADERS.slice(oldLastCol)]);
      // Copia el FORMATO visual (fondo, color, negrita, bordes) de la
      // última cabecera ya estilizada a mano, en vez de re-inventar los
      // colores del tema — así la columna nueva se ve igual que las demás.
      sheet.getRange(1, oldLastCol)
           .copyFormatToRange(sheet, firstNewCol, RSVP_HEADERS.length, 1, 1);
    }

    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(data.timestamp),
      data.id,
      data.nombre,
      data.telefono,
      data.asistencia,
      data.cant_acompanantes,
      data.acompanantes,
      data.mensaje,
      data.buseta
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 2. SINCRONIZAR INVITADOS → GITHUB (invitados.json)
// Se ejecuta automáticamente cada vez que editas la hoja
// ============================================================
function syncInvitadosAGitHub() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Invitados');
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return; // sin datos

  // Leer columnas A (ID), B (Nombre), C (Acompañantes) desde fila 4
  const data = sheet.getRange(4, 1, lastRow - 3, 3).getValues();

  // Construir objeto JSON
  const invitados = {};
  data.forEach(([id, nombre, acomp]) => {
    if (!id || !nombre) return; // saltar filas vacías
    invitados[String(id)] = {
      nombre:       String(nombre).trim(),
      acompanantes: parseInt(acomp) || 0
    };
  });

  // Siempre incluir invitado demo para pruebas
  invitados['demo'] = { nombre: 'Invitado Demo', acompanantes: 2 };

  const jsonContent = JSON.stringify(invitados, null, 2);

  // Subir a GitHub
  pushToGitHub(JSON_FILE, jsonContent);
}

// ============================================================
// 3. PUSH A GITHUB
// ============================================================
function pushToGitHub(filename, content) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filename}`;

  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // Obtener SHA del archivo actual (necesario para actualizar)
  let sha = '';
  try {
    const getRes = UrlFetchApp.fetch(apiUrl, { headers, muteHttpExceptions: true });
    if (getRes.getResponseCode() === 200) {
      sha = JSON.parse(getRes.getContentText()).sha;
    }
  } catch(e) { /* archivo nuevo, sin SHA */ }

  // Codificar contenido en Base64
  const encoded = Utilities.base64Encode(
    Utilities.newBlob(content, 'application/json', filename).getBytes()
  );

  // Payload
  const payload = {
    message: `🔄 Actualizar invitados.json — ${new Date().toLocaleString('es-CR')}`,
    content: encoded,
    branch:  GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  // PUT request
  const res = UrlFetchApp.fetch(apiUrl, {
    method:             'put',
    headers,
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code === 200 || code === 201) {
    console.log('✅ invitados.json actualizado en GitHub');
  } else {
    console.error('❌ Error GitHub:', code, res.getContentText());
  }
}

// ============================================================
// 4. CREAR TRIGGER — ejecutar UNA SOLA VEZ desde el editor
// Menú: Ejecutar → crearTrigger
// ============================================================
function crearTrigger() {
  // Eliminar triggers anteriores del mismo tipo
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncInvitadosAGitHub') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crear trigger: se ejecuta al editar cualquier celda del Sheet
  ScriptApp.newTrigger('syncInvitadosAGitHub')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  console.log('✅ Trigger creado — cada edición sincronizará con GitHub');
}

// ============================================================
// 5. CORREGIR ESTILO DE LA CABECERA "Requiere buseta"
// Ejecutar UNA SOLA VEZ desde el editor: Ejecutar → fixBusetaHeaderStyle
// La columna se creó automáticamente la primera vez que llegó un RSVP
// después de agregar el campo, y quedó en negrita simple en vez del
// mismo fondo/color/bordes que el resto de la cabecera. Este fix copia
// el formato de la cabecera vecina ("Mensaje para los novios") sobre
// ella. A partir de ahora, si la cabecera se vuelve a crear desde cero
// (sección 1), ya sale con el estilo correcto y este fix no hace falta.
// ============================================================
function fixBusetaHeaderStyle() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RSVPs');
  if (!sheet) return;

  const scanRows = Math.min(6, sheet.getLastRow());
  const grid = sheet.getRange(1, 1, scanRows, sheet.getLastColumn()).getValues();

  // Localiza la etiqueta "Mensaje..." en las primeras filas en vez de dar
  // por hecho que la cabecera es la fila 1. La hoja tiene una banda de
  // título ENCIMA de las etiquetas, y copiar el formato de una celda de
  // esa banda (que está combinada) arrastraría la combinación a la
  // columna nueva y descuadraría la tabla.
  let hRow = -1, mCol = -1;
  for (let r = 0; r < grid.length && hRow === -1; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (String(grid[r][c]).trim().toUpperCase().indexOf('MENSAJE') === 0) {
        hRow = r + 1;
        mCol = c + 1;
        break;
      }
    }
  }
  if (hRow === -1) {
    console.error('❌ No se encontró la cabecera "Mensaje...". Revisa la hoja RSVPs.');
    return;
  }

  const bCol = mCol + 1;

  // Si la etiqueta quedó escrita en otra fila (la primera versión la
  // escribía siempre en la fila 1, que aquí es la banda de título), se
  // limpia para no dejar texto suelto fuera de la cabecera.
  for (let r = 1; r <= scanRows; r++) {
    if (r === hRow) continue;
    const cell = sheet.getRange(r, bCol);
    if (String(cell.getValue()).trim() === 'Requiere buseta') cell.clearContent();
  }

  sheet.getRange(hRow, mCol).copyFormatToRange(sheet, bCol, bCol, hRow, hRow);
  sheet.getRange(hRow, bCol).setValue('Requiere buseta');

  console.log('✅ Cabecera "Requiere buseta" corregida — fila ' + hRow + ', columna ' + bCol);
}

// ============================================================
// 6. INVITADOS EN VIVO — reset automático de acompañantes
// Simple trigger: Google lo detecta por el nombre `onEdit` y lo
// ejecuta solo con cada edición, sin necesidad de crearTrigger().
// No requiere autorización porque sólo toca el propio Sheet (a
// diferencia de syncInvitadosAGitHub, que sí necesita permiso porque
// llama a la API de GitHub).
//
// Si se borra el Nombre (columna B) de un invitado, ya no tiene
// sentido que conserve un número de acompañantes: se reinicia a 0
// en el mismo instante, sin esperar a guardar ni recargar.
// ============================================================
const INV_SHEET_NAME = 'Invitados';
const INV_COL_NOMBRE = 2; // B
const INV_COL_ACOMP  = 3; // C
const INV_HEADER_ROW = 3; // los datos empiezan en la fila 4

function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== INV_SHEET_NAME) return;

    const startCol = e.range.getColumn();
    const endCol    = startCol + e.range.getNumColumns() - 1;
    // Ignorar ediciones que no toquen la columna Nombre (permite
    // borrar en bloque varias filas o columnas a la vez, no sólo
    // una celda suelta).
    if (INV_COL_NOMBRE < startCol || INV_COL_NOMBRE > endCol) return;

    const startRow = e.range.getRow();
    const numRows  = e.range.getNumRows();

    for (let i = 0; i < numRows; i++) {
      const row = startRow + i;
      if (row <= INV_HEADER_ROW) continue; // no tocar la cabecera

      const nombreCell = sheet.getRange(row, INV_COL_NOMBRE);
      if (nombreCell.getValue() === '') {
        sheet.getRange(row, INV_COL_ACOMP).setValue(0);
      }
    }
  } catch (err) {
    console.error('onEdit error:', err);
  }
}

// ============================================================
// 7. OCULTAR COLUMNAS AUTOMÁTICAS (LINK y JSON) EN "Invitados"
// Ejecutar UNA SOLA VEZ: Ejecutar → ocultarColumnasAutoInvitados
// Son fórmulas (ver APPS_SCRIPT_README.txt) — ocultar la columna NO
// detiene su cálculo, sólo deja de mostrarla, así que el link de
// WhatsApp y el JSON se siguen generando exactamente igual.
// Para volver a verlas: seleccionar las columnas vecinas (C y F) →
// clic derecho → "Mostrar columnas D-E".
// ============================================================
function ocultarColumnasAutoInvitados() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INV_SHEET_NAME);
  if (!sheet) return;

  // Se buscan por TÍTULO y no por letra fija (D y E): si algún día se
  // reordenan o se inserta una columna, esto sigue ocultando las
  // correctas en vez de esconder datos que sí hay que ver.
  const titulos = sheet.getRange(INV_HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  let ocultadas = 0;

  titulos.forEach((titulo, i) => {
    const t = String(titulo).toUpperCase();
    if (t.indexOf('LINK') !== -1 || t.indexOf('JSON') !== -1) {
      sheet.hideColumns(i + 1);
      ocultadas++;
    }
  });

  if (ocultadas) {
    console.log('✅ ' + ocultadas + ' columna(s) automáticas ocultas en Invitados');
  } else {
    console.error('❌ No se encontraron columnas LINK/JSON en la fila ' + INV_HEADER_ROW);
  }
}
