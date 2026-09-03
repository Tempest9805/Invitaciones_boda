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
// 0. CONFIGURACIÓN INICIAL — ⭐ LA ÚNICA QUE HAY QUE EJECUTAR
// Ejecutar → configurarTodo  (una sola vez, tras pegar el código)
//
// En Apps Script el botón ▶ corre UNA función, no el archivo entero.
// Esta agrupa todos los ajustes de un solo uso para no tener que
// ejecutarlos por separado. Es idempotente: correrla dos veces no
// hace daño.
//
// NO ejecutar a mano: doPost, onEdit y pushToGitHub esperan
// parámetros (una petición HTTP o un evento de edición) y fallan si
// se lanzan sueltas desde el editor. Se llaman solas cuando toca.
// ============================================================
function configurarTodo() {
  const resultados = [];

  try {
    fixBusetaHeaderStyle();
    resultados.push('cabecera RSVPs: OK');
  } catch (err) {
    resultados.push('cabecera RSVPs: FALLÓ — ' + err.message);
  }

  try {
    ajustarColumnasInvitados();
    resultados.push('columnas automáticas: OK');
  } catch (err) {
    resultados.push('columnas automáticas: FALLÓ — ' + err.message);
  }

  try {
    configurarColumnaWhatsApp();
    resultados.push('columna WhatsApp: OK');
  } catch (err) {
    resultados.push('columna WhatsApp: FALLÓ — ' + err.message);
  }

  try {
    crearTrigger();
    resultados.push('trigger de sync: OK');
  } catch (err) {
    resultados.push('trigger de sync: FALLÓ — ' + err.message);
  }

  console.log('──────── RESUMEN ────────');
  resultados.forEach(r => console.log('• ' + r));
  console.log('El reset de acompañantes (onEdit) no aparece aquí:');
  console.log('se activa solo al guardar, no hay que ejecutarlo.');
}

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
  // Limpiar triggers de versiones anteriores (el sync corría suelto).
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'syncInvitadosAGitHub' || fn === 'alEditarInvitados') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('alEditarInvitados')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  console.log('✅ Trigger creado — confirmación de borrado + sync a GitHub');
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
// 6. INVITADOS EN VIVO — confirmar borrado, resetear y sincronizar
//
// Todo vive en UN solo handler instalado por crearTrigger(), y no en
// un `onEdit` simple, por dos razones:
//
//   1. Un onEdit simple corre SIN autorización, así que no podría
//      llamar a GitHub (UrlFetchApp) después de restaurar un nombre.
//   2. Antes el sync corría en su propio trigger, EN PARALELO. Al
//      pedir confirmación, el sync subía el borrado a GitHub mientras
//      el diálogo seguía abierto; si luego se decía "No", el nombre
//      volvía a la hoja pero en GitHub ya no estaba. Secuencial no
//      puede pasar.
//
// Ojo: onEdit se dispara DESPUÉS de que la celda ya se borró — no
// existe forma de cancelar la edición. Lo que se hace es preguntar y
// volver a escribir el valor anterior si la respuesta es "No".
// ============================================================
const INV_SHEET_NAME = 'Invitados';
const INV_COL_NOMBRE = 2; // B
const INV_COL_ACOMP  = 3; // C
const INV_HEADER_ROW = 3; // los datos empiezan en la fila 4

function alEditarInvitados(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== INV_SHEET_NAME) {
      return; // otras hojas no sincronizan ni resetean
    }

    const filaIni = e.range.getRow();
    const nFilas  = e.range.getNumRows();
    const colIni  = e.range.getColumn();
    const colFin  = colIni + e.range.getNumColumns() - 1;
    const tocaNombre = (INV_COL_NOMBRE >= colIni && INV_COL_NOMBRE <= colFin);

    if (tocaNombre) {
      // ── Caso 1: una sola celda. Hay e.oldValue, así que se puede
      //    preguntar y deshacer.
      if (nFilas === 1 && e.range.getNumColumns() === 1 && filaIni > INV_HEADER_ROW) {
        const ahora  = String(e.range.getValue()).trim();
        const antes  = (e.oldValue === undefined) ? '' : String(e.oldValue).trim();

        if (ahora === '' && antes !== '') {
          if (!confirmarBorrado(antes)) {
            e.range.setValue(e.oldValue); // restaurar
            sincronizarSiCorresponde();   // GitHub queda coherente
            return;
          }
        }
      }

      // ── Caso 2: borrado en bloque. Sin e.oldValue no hay forma
      //    fiable de restaurar, así que no se pregunta: se avisa y
      //    queda Ctrl+Z como salida.
      if (nFilas > 1) {
        avisar('Se editaron ' + nFilas + ' filas de golpe. ' +
               'Si fue sin querer, usa Ctrl+Z para deshacer.');
      }

      // Reset de acompañantes en las filas que quedaron sin nombre
      for (let i = 0; i < nFilas; i++) {
        const fila = filaIni + i;
        if (fila <= INV_HEADER_ROW) continue;
        if (String(sheet.getRange(fila, INV_COL_NOMBRE).getValue()).trim() === '') {
          sheet.getRange(fila, INV_COL_ACOMP).setValue(0);
        }
      }
    }

    // Sólo sincronizar si cambió algo que viaje en el JSON (ID, Nombre
    // o Acompañantes). Antes subía a GitHub en CADA celda editada:
    // llenar la lista generaba cientos de commits y consumía la cuota
    // diaria de triggers.
    if (colIni <= INV_COL_ACOMP) {
      sincronizarSiCorresponde();
    }
  } catch (err) {
    console.error('alEditarInvitados error:', err);
  }
}

// Diálogo de confirmación. Si no hay interfaz disponible (el trigger
// corrió sin una ventana abierta), devuelve true para no bloquear.
function confirmarBorrado(nombre) {
  let ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (err) {
    return true;
  }

  const resp = ui.alert(
    '\u00bfBorrar a este invitado?',
    'Vas a borrar a "' + nombre + '".\n\n' +
    'Se quitar\u00e1 de la lista y el enlace que ya le hayas enviado ' +
    'dejar\u00e1 de mostrar su nombre.\n\n\u00bfContinuar?',
    ui.ButtonSet.YES_NO
  );
  return resp === ui.Button.YES;
}

function avisar(mensaje) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(mensaje, '⚠️ Atención', 8);
  } catch (err) { /* sin interfaz, se ignora */ }
}

function sincronizarSiCorresponde() {
  try {
    syncInvitadosAGitHub();
  } catch (err) {
    console.error('Sync falló:', err);
  }
}

// ============================================================
// 7. COLUMNAS AUTOMÁTICAS DE "Invitados"
//
// Las tres columnas que la propia hoja marca como "(auto)" son
// fórmulas: ID, LINK y JSON. Ninguna debe escribirse a mano, pero NO
// se tratan igual:
//
//   • JSON  → se OCULTA. Sólo alimenta invitados.json, nadie lo lee.
//   • LINK  → se DEJA VISIBLE. Es el enlace que hay que enviar por
//             WhatsApp a cada invitado; ocultarlo dejaba sin
//             herramienta a quien administra la lista.
//   • ID    → se deja visible, sirve para identificar la fila.
//
// Las tres se PROTEGEN con aviso: si alguien intenta escribir encima
// de la fórmula, Sheets avisa antes de romperla, pero se puede
// continuar a propósito. Copiar el link no se ve afectado: la
// protección limita la edición, no la lectura.
//
// Para revertir: Datos → Hojas y rangos protegidos (quitar), y
// clic derecho sobre las columnas vecinas → Mostrar columnas.
// ============================================================
const INV_PROTECT_TAG = 'Columna automática (boda) — no editar';

function ajustarColumnasInvitados() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INV_SHEET_NAME);
  if (!sheet) return;

  // Quitar las protecciones puestas por este script en corridas
  // anteriores, para que ejecutarlo dos veces no las acumule.
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => {
    if (p.getDescription() === INV_PROTECT_TAG) p.remove();
  });

  const titulos = sheet.getRange(INV_HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  const maxRows = sheet.getMaxRows();
  let ocultas = 0, visibles = 0, protegidas = 0;

  titulos.forEach((titulo, i) => {
    const t   = String(titulo).toUpperCase();
    const col = i + 1;

    // La hoja marca sus columnas calculadas con "(auto)" en el título.
    if (t.indexOf('AUTO') === -1) return;

    if (t.indexOf('JSON') !== -1) {
      sheet.hideColumns(col);
      ocultas++;
    } else {
      // LINK e ID: asegurar que quedan visibles aunque una corrida
      // anterior las hubiera ocultado.
      sheet.showColumns(col);
      visibles++;
    }

    sheet.getRange(1, col, maxRows)
         .protect()
         .setDescription(INV_PROTECT_TAG)
         .setWarningOnly(true);
    protegidas++;
  });

  if (protegidas) {
    console.log('✅ Invitados: ' + ocultas + ' oculta(s), ' + visibles +
                ' visible(s), ' + protegidas + ' protegida(s) con aviso');
  } else {
    console.error('❌ No se encontraron columnas "(auto)" en la fila ' + INV_HEADER_ROW);
  }
}

// ============================================================
// 8. COLUMNA "ENVIAR POR WHATSAPP"
// Se ejecuta dentro de configurarTodo.
//
// Por qué un enlace wa.me y no un envío automático:
//   • La API oficial (WhatsApp Cloud API) SECUESTRA el número: una vez
//     registrado ya no se puede usar en la app normal de WhatsApp.
//     Además exige verificación de empresa y plantillas aprobadas.
//   • Las librerías no oficiales violan los términos y mandar ~100
//     mensajes casi idénticos es justo lo que dispara su antispam:
//     riesgo real de perder el número antes de la boda.
//
// Con wa.me, al hacer clic se abre WhatsApp desde el número de ella
// con el mensaje y el enlace ya escritos para ESE invitado. Sólo hay
// que pulsar enviar. Un toque por invitado, gratis y sin riesgo.
//
// Crea (si no existen) dos columnas al final: TELÉFONO y WHATSAPP.
// Se añaden al final para no descuadrar las columnas ya existentes.
// ============================================================
const WA_PAIS = '506'; // código de país sin el "+", Costa Rica
const WA_MENSAJE = '\u00a1Hola {NOMBRE}! \ud83d\udc8d Estiven y Johana te invitan a su boda ' +
                   'el 13 de marzo de 2027. Esta es tu invitaci\u00f3n personal:';

function configurarColumnaWhatsApp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INV_SHEET_NAME);
  if (!sheet) return;

  const buscarCol = (titulos, texto) => {
    let encontrada = 0;
    titulos.forEach((t, i) => {
      if (String(t).toUpperCase().indexOf(texto) !== -1) encontrada = i + 1;
    });
    return encontrada;
  };

  let titulos = sheet.getRange(INV_HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

  const colLink = buscarCol(titulos, 'LINK');
  if (!colLink) {
    console.error('\u274c No se encontr\u00f3 la columna LINK; no se puede armar el mensaje.');
    return;
  }

  // Crear TELÉFONO y WHATSAPP si faltan, copiando el formato de una
  // cabecera existente para que no desentonen.
  const crearColumna = (titulo) => {
    const col = sheet.getLastColumn() + 1;
    sheet.getRange(INV_HEADER_ROW, colLink)
         .copyFormatToRange(sheet, col, col, INV_HEADER_ROW, INV_HEADER_ROW);
    sheet.getRange(INV_HEADER_ROW, col).setValue(titulo);
    sheet.setColumnWidth(col, 150);
    return col;
  };

  let colTel = buscarCol(titulos, 'TEL');
  if (!colTel) colTel = crearColumna('\u270f\ufe0f TEL\u00c9FONO\nCon o sin c\u00f3digo de pa\u00eds');

  titulos = sheet.getRange(INV_HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  let colWa = buscarCol(titulos, 'WHATSAPP');
  if (!colWa) colWa = crearColumna('\ud83d\udcf2 WHATSAPP\n(auto — clic para enviar)');

  // Rellenar la fórmula desde la primera fila de datos hasta el final
  // de la hoja, para que los invitados nuevos ya traigan su botón.
  const letra = n => {
    let r = '';
    while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = (n - m - 1) / 26; }
    return r;
  };

  const lTel  = letra(colTel);
  const lNom  = letra(INV_COL_NOMBRE);
  const lLink = letra(colLink);
  const desde = INV_HEADER_ROW + 1;
  const hasta = sheet.getMaxRows();

  const formulas = [];
  for (let fila = desde; fila <= hasta; fila++) {
    const refTel  = '$' + lTel  + fila;
    const refNom  = '$' + lNom  + fila;
    const refLink = '$' + lLink + fila;

    // Deja sólo dígitos y antepone el código de país si el número
    // viene en formato local de 8 cifras.
    const digitos = 'REGEXREPLACE(TO_TEXT(' + refTel + '),"\D","")';
    const numero  = 'IF(LEN(' + digitos + ')=8,"' + WA_PAIS + '"&' + digitos + ',' + digitos + ')';
    const texto   = 'ENCODEURL(SUBSTITUTE("' + WA_MENSAJE + '","{NOMBRE}",' + refNom + ')&" "&' + refLink + ')';

    formulas.push([
      '=IF(' + refNom + '="","",' +
        'IF(' + digitos + '="","\u26a0\ufe0f Falta tel\u00e9fono",' +
          'HYPERLINK("https://wa.me/"&' + numero + '&"?text="&' + texto + ',"\ud83d\udcf2 Enviar")))'
    ]);
  }

  sheet.getRange(desde, colWa, formulas.length, 1).setFormulas(formulas);

  console.log('\u2705 WhatsApp listo — tel\u00e9fono en columna ' + lTel +
              ', bot\u00f3n en columna ' + letra(colWa));
}
