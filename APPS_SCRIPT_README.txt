============================================================
  GOOGLE APPS SCRIPT — RSVP a Google Sheets
============================================================

PASO A PASO:

1. Abre tu Google Sheet de invitados
2. Menú superior: Extensiones → Apps Script
3. Borra el código de ejemplo y pega TODO lo de abajo
4. Guarda (Ctrl+S)
5. Clic en "Implementar" → "Nueva implementación"
6. Tipo: "Aplicación web"
7. Ejecutar como: "Yo"
8. Quién tiene acceso: "Cualquier persona"
9. Clic en "Implementar" → Copia la URL
10. Pega esa URL en index.html donde dice RSVP_ENDPOINT

------------------------------------------------------------
CÓDIGO DEL APPS SCRIPT (pegar completo):
------------------------------------------------------------

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
                    .getSheetByName('RSVPs'); // Crea esta hoja en tu Sheet

    // Si la hoja no existe, crearla con headers
    if (!sheet.getLastRow()) {
      sheet.appendRow([
        'Timestamp', 'ID', 'Nombre', 'Teléfono',
        'Asistencia', 'Acompañantes', 'Mensaje'
      ]);
    }

    const data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date(data.timestamp),
      data.id,
      data.nombre,
      data.telefono,
      data.asistencia === 'si' ? '✅ Sí' : '❌ No',
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

------------------------------------------------------------
RESULTADO:
Cada RSVP que llegue se guarda en una hoja llamada "RSVPs"
con columnas: Timestamp, ID, Nombre, Teléfono, Asistencia,
Acompañantes, Mensaje
============================================================


============================================================
  GOOGLE SHEET — ESTRUCTURA RECOMENDADA
============================================================

HOJA 1: "Invitados"
Columnas:
  A: id          → fórmula: =TEXT(ROW()-1,"000")&"boda26"
  B: nombre      → texto libre (ej: "Familia Rodríguez")
  C: acompanantes_max → número: 0, 1, 2, 3, 4...
  D: telefono    → texto (ej: "8888-0000")
  E: link        → fórmula: ="https://tu-sitio.netlify.app/?id="&A2

HOJA 2: "RSVPs"
Se llena automáticamente con el Apps Script cuando alguien confirma.

------------------------------------------------------------
PARA GENERAR EL JSON DE INVITADOS:
En la misma hoja, puedes agregar una columna JSON:
  F: json → ="  """&A2&""": { ""nombre"": """&B2&""", ""acompanantes"": "&C2&" },"

Luego copia todo el rango F y pégalo en el objeto INVITADOS
del index.html reemplazando los ejemplos.
============================================================
