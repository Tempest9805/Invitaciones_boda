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
const SITE_URL      = 'https://invitacionesbodaej.netlify.app'; // sin barra final
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
    contadorPersonasRSVP();
    resultados.push('contador de personas: OK');
  } catch (err) {
    resultados.push('contador de personas: FALLÓ — ' + err.message);
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

  const cab     = detectarFilaCabecera(sheet);
  const primera = cab + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < primera) return; // sin datos

  // Leer columnas A (ID), B (Nombre), C (Acompañantes) bajo la cabecera
  const data = sheet.getRange(primera, 1, lastRow - cab, 3).getValues();

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
const INV_HEADER_ROW = 3; // valor por defecto; ver detectarFilaCabecera

// ------------------------------------------------------------
// La cabecera NO se asume en la fila 3. Encima hay una banda de
// titulo combinada y basta con editarla a mano (cambiar la fecha,
// meter un salto de linea, insertar una fila) para que todo se
// corra una fila. Cuando eso pasaba, buscarCol leia la fila 3, no
// encontraba "LINK" y la funcion se salia sin escribir ninguna
// formula: la columna de links dejaba de generarse.
//
// Se busca la fila que contiene el titulo "NOMBRE" en las primeras
// 10 filas. Si no aparece, se cae al valor por defecto.
// ------------------------------------------------------------
function detectarFilaCabecera(sheet) {
  const hasta = Math.min(10, sheet.getLastRow());
  if (hasta < 1) return INV_HEADER_ROW;

  // No vale con buscar la primera fila que diga "NOMBRE": la banda de
  // titulo o una fila de instrucciones puede llevar esa palabra y
  // ganarle a la cabecera de verdad. Se puntua cada fila por cuantos
  // titulos reconoce y se queda con la mejor.
  const CLAVES = ['NOMBRE', 'ACOMP', 'LINK', 'JSON', 'TEL', 'WHATSAPP', 'AUTO', 'ID'];
  const filas = sheet.getRange(1, 1, hasta, sheet.getLastColumn()).getValues();

  let mejor = 0, mejorPunt = 0, mejorLlenas = 0;
  for (let i = 0; i < filas.length; i++) {
    const celdas = filas[i].map(v => String(v).toUpperCase().trim());
    const llenas = celdas.filter(t => t !== '').length;

    // Una banda de titulo combinada deja una sola celda con texto y el
    // resto vacias; una cabecera de verdad llena varias columnas.
    if (llenas < 2) continue;

    let punt = 0;
    CLAVES.forEach(k => {
      if (celdas.some(t => t.indexOf(k) !== -1)) punt++;
    });

    if (punt > mejorPunt || (punt === mejorPunt && punt > 0 && llenas > mejorLlenas)) {
      mejor = i + 1; mejorPunt = punt; mejorLlenas = llenas;
    }
  }

  if (mejorPunt < 2) {
    console.warn('⚠️ No se reconocio la cabecera de Invitados en las primeras ' +
                 hasta + ' filas; se usa la fila ' + INV_HEADER_ROW);
    return INV_HEADER_ROW;
  }

  if (mejor !== INV_HEADER_ROW) {
    console.log('ℹ️ Cabecera de Invitados detectada en la fila ' + mejor +
                ' (' + mejorPunt + ' titulos reconocidos; por defecto era ' + INV_HEADER_ROW + ')');
  }
  return mejor;
}

function alEditarInvitados(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== INV_SHEET_NAME) {
      return; // otras hojas no sincronizan ni resetean
    }

    const cab     = detectarFilaCabecera(sheet);
    const filaIni = e.range.getRow();
    const nFilas  = e.range.getNumRows();
    const colIni  = e.range.getColumn();
    const colFin  = colIni + e.range.getNumColumns() - 1;
    const tocaNombre = (INV_COL_NOMBRE >= colIni && INV_COL_NOMBRE <= colFin);

    if (tocaNombre) {
      // ── Caso 1: una sola celda. Hay e.oldValue, así que se puede
      //    preguntar y deshacer.
      if (nFilas === 1 && e.range.getNumColumns() === 1 && filaIni > cab) {
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
        if (fila <= cab) continue;
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

  const cab     = detectarFilaCabecera(sheet);
  const titulos = sheet.getRange(cab, 1, 1, sheet.getLastColumn()).getValues()[0];
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
    // Se lanza en vez de solo avisar: si no, configurarTodo lo cuenta
    // como OK en el resumen y el fallo pasa desapercibido.
    throw new Error('no se encontraron columnas "(auto)" en la fila ' + cab +
                    '; revisa que esa fila sea la cabecera');
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
// Endpoint oficial de click-to-chat. Se usa api.whatsapp.com y no
// wa.me porque hay redes y DNS caseros que no resuelven wa.me
// (falla con 'servidor no encontrado'). Ambos son equivalentes.
const WA_URL_BASE = 'https://api.whatsapp.com/send?phone=';
const WA_MENSAJE = '\u00a1Hola {NOMBRE}! \ud83d\udc8d Estiven y Johana te invitan a su boda ' +
                   'el 9 de enero de 2027. Esta es tu invitaci\u00f3n personal:';

// ============================================================
// CONTADOR DE PERSONAS EN LA HOJA RSVPs
//
// Cada fila confirmada son 1 (el invitado) + sus acompañantes. Se
// escribe una fórmula viva en un recuadro a la derecha de la tabla,
// así que se actualiza sola con cada confirmación nueva sin depender
// de ningún trigger.
//
// Sólo cuenta a quien dijo que sí: una fila con "No podré asistir"
// no debe sumar personas a la cuenta de la comida.
// ============================================================
const RSVP_ETIQUETA_TOTAL = 'PERSONAS CONFIRMADAS';

function contadorPersonasRSVP() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RSVPs');
  if (!sheet) throw new Error('no existe la hoja "RSVPs"');

  const scan = Math.min(8, sheet.getLastRow());
  if (scan < 1) throw new Error('la hoja "RSVPs" está vacía');

  const ancho = sheet.getLastColumn();
  const grid  = sheet.getRange(1, 1, scan, ancho).getValues();

  // Localizar la cabecera por sus títulos, no por su número de fila:
  // encima hay una banda de título y basta con editarla para correrlo
  // todo. Ojo: "Cant. Acompañantes" y "Nombres Acompañantes" empiezan
  // igual, por eso la de la cuenta se pide además con "CANT".
  let hRow = -1, colAsis = -1, colAcomp = -1, colEtiqueta = 0;
  for (let r = 0; r < grid.length; r++) {
    const fila = grid[r].map(v => String(v).trim().toUpperCase());

    fila.forEach((t, i) => {
      if (t.indexOf(RSVP_ETIQUETA_TOTAL) !== -1) colEtiqueta = i + 1;
    });

    if (hRow !== -1) continue;
    let iA = -1, iC = -1;
    fila.forEach((t, i) => {
      if (t.indexOf('ASISTENCIA') !== -1) iA = i;
      if (t.indexOf('CANT') !== -1 && t.indexOf('ACOMPA') !== -1) iC = i;
    });
    if (iA !== -1 && iC !== -1) { hRow = r + 1; colAsis = iA + 1; colAcomp = iC + 1; }
  }

  if (hRow === -1) {
    throw new Error('no se encontraron las cabeceras "Asistencia" y ' +
                    '"Cant. Acompañantes" en las primeras ' + scan + ' filas de RSVPs');
  }

  const letra = n => {
    let r = '';
    while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = (n - m - 1) / 26; }
    return r;
  };

  const S      = detectarSeparador();
  const inicio = hRow + 1;                 // primera fila de datos
  const lAsis  = letra(colAsis);
  const lAcomp = letra(colAcomp);

  // Se reutiliza la columna del recuadro si ya existe, para que
  // ejecutarlo dos veces no lo vaya corriendo hacia la derecha.
  const col = colEtiqueta || (ancho + 2);  // +2 deja un hueco con la tabla

  // "✅ Sí" / "❌ No" es lo que escribe el formulario. Se compara con el
  // final del texto para que siga valiendo si alguien quita el emoji o
  // lo escribe en minúscula.
  const rango  = '$' + lAsis + '$' + inicio + ':$' + lAsis;
  const rangoA = '$' + lAcomp + '$' + inicio + ':$' + lAcomp;
  const esSi   = 'REGEXMATCH(TO_TEXT(' + rango + ')' + S + '"(?i)s[íi]$")';
  const suma   = '1+IFERROR(' + rangoA + '*1' + S + '0)';
  const total  = '=SUMPRODUCT(ARRAYFORMULA(IF(' + esSi + S + suma + S + '0)))';

  const filaEtiqueta = (hRow > 1) ? hRow - 1 : 1;
  const filaValor    = (hRow > 1) ? hRow     : 2;

  try {
    const cE = sheet.getRange(filaEtiqueta, col);
    const cV = sheet.getRange(filaValor, col);

    cE.setValue('👥 ' + RSVP_ETIQUETA_TOTAL);
    cE.setBackground('#3A4225').setFontColor('#C4A962')
      .setFontSize(9).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    cV.setFormula(total);
    cV.setBackground('#3A4225').setFontColor('#F5F0E8')
      .setFontSize(20).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    sheet.setColumnWidth(col, 190);
  } catch (err) {
    throw new Error('no se pudo escribir el recuadro en la columna ' + letra(col) +
                    ' (' + err.message + ')');
  }

  console.log('✅ Contador de personas en ' + letra(col) + filaValor +
              ' — asistencia en ' + lAsis + ', acompañantes en ' + lAcomp +
              ', datos desde la fila ' + inicio);
}

// ------------------------------------------------------------
// El separador de argumentos depende de la configuración regional de
// la hoja: "," en locales tipo EE.UU. y ";" en español. Una fórmula
// escrita con el separador equivocado NO da un error descriptivo:
// da #ERROR! a secas, que es justo lo que estaba pasando.
//
// En vez de mantener una tabla de locales, se mide: se escribe una
// fórmula de prueba con "," en una hoja temporal y se comprueba si
// Sheets la entendió.
// ------------------------------------------------------------
function detectarSeparador() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tmp = null;
  try {
    tmp = ss.insertSheet('__probe_sep__');
    tmp.getRange(1, 1).setFormula('=IF(1=1,"ok","no")');
    SpreadsheetApp.flush();
    const sep = (tmp.getRange(1, 1).getDisplayValue() === 'ok') ? ',' : ';';
    console.log('Separador detectado: "' + sep + '"  |  locale: ' +
                ss.getSpreadsheetLocale());
    return sep;
  } catch (err) {
    console.error('No se pudo detectar el separador, se asume ",": ' + err.message);
    return ',';
  } finally {
    if (tmp) { try { ss.deleteSheet(tmp); } catch (e) {} }
  }
}

function configurarColumnaWhatsApp() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INV_SHEET_NAME);
  if (!sheet) return;

  // OJO: la cabecera de LINK dice "enviar por WhatsApp", asi que buscar
  // 'WHATSAPP' a secas la encontraba a ella y el script escribia la
  // formula ENCIMA de LINK. Como la formula se referencia a si misma,
  // la celda quedaba en #ERROR!. Por eso hay que poder excluir las
  // columnas ya identificadas.
  const buscarCol = (titulos, texto, excluir) => {
    excluir = excluir || [];
    let encontrada = 0;
    titulos.forEach((t, i) => {
      const col = i + 1;
      if (excluir.indexOf(col) !== -1) return;
      if (String(t).toUpperCase().indexOf(texto) !== -1) encontrada = col;
    });
    return encontrada;
  };

  const S = detectarSeparador();

  const cab = detectarFilaCabecera(sheet);
  let titulos = sheet.getRange(cab, 1, 1, sheet.getLastColumn()).getValues()[0];

  const colLink = buscarCol(titulos, 'LINK');
  if (!colLink) {
    throw new Error('no se encontró la columna LINK en la fila ' + cab +
                    '; revisa que esa fila siga siendo la cabecera');
  }

  // Crear TELÉFONO y WHATSAPP si faltan, copiando el formato de una
  // cabecera existente para que no desentonen.
  const crearColumna = (titulo) => {
    const col = sheet.getLastColumn() + 1;
    // Copiar el formato es cosmetico: si la cabecera toca una celda
    // combinada o el limite de la region inmovilizada, Sheets lanza
    // una excepcion. Antes eso abortaba toda la funcion y no se
    // escribia ninguna formula. Ahora se avisa y se sigue.
    try {
      sheet.getRange(cab, colLink)
           .copyFormatToRange(sheet, col, col, cab, cab);
    } catch (err) {
      console.warn('⚠️ No se pudo copiar el formato a la columna nueva "' +
                   titulo.split('\n')[0] + '": ' + err.message +
                   ' — se crea igual, solo sin el estilo.');
    }
    sheet.getRange(cab, col).setValue(titulo);
    sheet.setColumnWidth(col, 150);
    return col;
  };

  let colTel = buscarCol(titulos, 'TEL', [colLink]);
  if (!colTel) colTel = crearColumna('\u270f\ufe0f TEL\u00c9FONO\nCon o sin c\u00f3digo de pa\u00eds');

  titulos = sheet.getRange(cab, 1, 1, sheet.getLastColumn()).getValues()[0];
  let colWa = buscarCol(titulos, 'WHATSAPP', [colLink, colTel]);
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
  const lId   = letra(1);
  const desde = cab + 1;
  const hasta = sheet.getMaxRows();

  // La columna LINK es "(auto)", asi que la genera el script en vez de
  // depender de una formula escrita a mano — que es la que estaba
  // dando #ERROR!. Ademas el mensaje de WhatsApp la usa: si LINK
  // falla, el mensaje sale roto tambien.
  const linkFormulas = [];
  for (let fila = desde; fila <= hasta; fila++) {
    linkFormulas.push([
      '=IF($' + lNom + fila + '=""' + S + '""' + S + '"' + SITE_URL + '/?id="&$' + lId + fila + ')'
    ]);
  }
  sheet.getRange(desde, colLink, linkFormulas.length, 1).setFormulas(linkFormulas);

  const formulas = [];
  for (let fila = desde; fila <= hasta; fila++) {
    const refTel  = '$' + lTel  + fila;
    const refNom  = '$' + lNom  + fila;
    const refLink = '$' + lLink + fila;

    // Deja sólo dígitos y antepone el código de país si el número
    // viene en formato local de 8 cifras.
    const digitos = 'REGEXREPLACE(TO_TEXT(' + refTel + ')' + S + '"\\D"' + S + '"")';
    const numero  = 'IF(LEN(' + digitos + ')=8' + S + '"' + WA_PAIS + '"&' + digitos + S + digitos + ')';
    const texto   = 'ENCODEURL(SUBSTITUTE("' + WA_MENSAJE + '"' + S + '"{NOMBRE}"' + S + refNom + ')&" "&' + refLink + ')';

    formulas.push([
      '=IF(' + refNom + '=""' + S + '""' + S +
        'IF(' + digitos + '=""' + S + '"\u26a0\ufe0f Falta tel\u00e9fono"' + S +
          'HYPERLINK("' + WA_URL_BASE + '"&' + numero + '&"&text="&' + texto + S + '"\ud83d\udcf2 Enviar")))'
    ]);
  }

  sheet.getRange(desde, colWa, formulas.length, 1).setFormulas(formulas);

  console.log('✅ LINK regenerado en columna ' + lLink + ' -> ' + SITE_URL);
  console.log('\u2705 WhatsApp listo — tel\u00e9fono en columna ' + lTel +
              ', bot\u00f3n en columna ' + letra(colWa));
}
