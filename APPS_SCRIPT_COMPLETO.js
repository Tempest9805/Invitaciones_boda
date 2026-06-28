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
function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName('RSVPs');

    if (!sheet) {
      sheet = ss.insertSheet('RSVPs');
      sheet.appendRow([
        'Timestamp', 'ID', 'Nombre', 'Teléfono',
        'Asistencia', 'Cant. Acompañantes', 'Nombres Acompañantes', 'Mensaje'
      ]);
      // Formato header
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
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
      data.mensaje
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
