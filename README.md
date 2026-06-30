# 🌿 Invitación Digital — Boda Estiven & Johana

Invitación de boda digital personalizada por invitado, mobile-first, con animación de sobre, contador regresivo, formulario de confirmación de asistencia y sincronización automática con Google Sheets.

**URL de producción:** https://invitacionesbodaej.netlify.app

---

## 📁 Estructura del repositorio

```
Invitaciones_boda/
├── index.html          # Toda la invitación (HTML + CSS + JS en un solo archivo)
├── invitados.json      # Base de datos de invitados (auto-generado desde Google Sheets)
├── music.mp3           # Canción de fondo: Carín León - Decreté
├── photo-hero.jpg      # Foto principal hero (placeholder por ahora)
├── photo-couple2.jpg   # Segunda foto de la pareja (placeholder)
├── photo-album1.jpg    # Álbum — foto grande (placeholder)
├── photo-album2.jpg    # Álbum — foto pequeña izquierda (placeholder)
├── photo-album3.jpg    # Álbum — foto pequeña derecha (placeholder)
└── README.md           # Este archivo
```

---

## 🎨 Diseño y tema

- **Paleta:** Verde olivo `#5C6B3A`, negro `#1A1A18`, dorado `#C4A962`, crema `#F5F0E8`
- **Tipografía display:** Cormorant Garamond (serif, cursiva para nombres y títulos)
- **Tipografía cuerpo:** Raleway (sans-serif, ligero)
- **Enfoque:** Mobile-first, diseño elegante tipo sobre de papelería física
- **Animaciones:** Apertura de sobre al inicio, flores flotantes, scroll reveal en secciones, contador en tiempo real

---

## 📄 Secciones de la página (en orden)

| # | Sección | Descripción |
|---|---------|-------------|
| 1 | **Sobre animado** | Pantalla inicial con animación de sobre que se abre, sello tipo lacre con iniciales E&J, nombre del invitado y cupos disponibles |
| 2 | **Hero** | Foto principal con nombres Estiven & Johana y fecha |
| 3 | **Acompáñanos** | Flores animadas, título, subtítulo y contador regresivo (días, horas, min, seg) hasta el 13 de marzo 2026 |
| 4 | **Foto 2** | Segunda foto de la pareja a ancho completo |
| 5 | **Cita** | Frase romántica sobre fondo oscuro con comillas decorativas grandes |
| 6 | **Álbum** | Grid de 3 fotos: una grande arriba, dos pequeñas abajo |
| 7 | **Ceremonia** | Iglesia de San Isidro · 10:00 AM · botón Google Maps |
| 8 | **Recepción** | Sala de Eventos El Higuerón · 12:00 PM · botón Google Maps |
| 9 | **Itinerario** | Línea de tiempo vertical: Ceremonia → Recepción → Cena → Fiesta |
| 10 | **Regalos** | Sugerencias: Sinpe Móvil, transferencia, fondo luna de miel |
| 11 | **Dresscode** | Código de vestimenta hombres/mujeres + paleta de colores sugerida |
| 12 | **RSVP** | Formulario de confirmación personalizado por invitado |
| - | **Footer** | Nombres y fecha |

---

## ⚙️ Cómo funciona el sistema de invitados

### Flujo completo

```
Google Sheets (llenar invitados)
    ↓ Apps Script trigger onEdit
GitHub (invitados.json se actualiza automáticamente)
    ↓ Netlify detecta el push
Sitio web actualizado en ~30 segundos
```

### Personalización por URL

Cada invitado recibe un link único:
```
https://invitacionesbodaej.netlify.app/?id=001boda26
```

El JS lee el parámetro `id`, busca en `invitados.json` y personaliza:
- Nombre en el sobre animado
- Cupos de acompañantes disponibles
- Nombre en el formulario RSVP (solo lectura, no editable)

### Estructura de invitados.json

```json
{
  "001boda26": { "nombre": "Jose Daniel Chaves Vargas", "acompanantes": 3 },
  "002boda26": { "nombre": "Teresita Vargas Vazques", "acompanantes": 5 },
  "demo":      { "nombre": "Invitado Demo", "acompanantes": 2 }
}
```

- El ID sigue el patrón `NNNboda26` (número de 3 dígitos + sufijo fijo)
- `acompanantes` es el número de personas ADICIONALES al invitado principal (0 a 5)
- El ID `demo` siempre existe para pruebas

---

## 📋 Formulario RSVP

### Lo que ve el invitado

1. Su nombre (texto, no editable — viene del JSON)
2. Teléfono/WhatsApp (lo ingresa él)
3. ¿Asistirá? (Sí / No)
4. Si dice Sí y tiene cupos → dropdown de cuántos acompañantes trae
5. Nombre de cada acompañante (inputs dinámicos)
6. Mensaje para los novios

### Lo que llega a Google Sheets (hoja RSVPs)

| Columna | Dato |
|---------|------|
| Timestamp | Fecha y hora del envío |
| ID | ID del invitado |
| Nombre | Nombre del Excel (no editable por el invitado) |
| Teléfono | Ingresado por el invitado |
| Asistencia | ✅ Sí / ❌ No |
| Cant. Acompañantes | Número confirmado |
| Nombres Acompañantes | Nombres separados por coma |
| Mensaje | Mensaje para los novios |

### Endpoint

```javascript
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyzvZDRJUXMb9Sfvq33XqyDaAcM17QNn_Yjv9EBUwOhYKaoTsrqYJIoaUISoNfp8PxT/exec';
```

---

## 🔧 Variables de configuración en index.html

Todas las variables editables están al inicio del bloque `<script>`:

```javascript
// Fecha de la boda para el contador
const WEDDING_DATE = new Date('2026-03-13T10:00:00');

// URL de la API de GitHub para cargar invitados
const INVITADOS_JSON_URL =
  'https://api.github.com/repos/Tempest9805/Invitaciones_boda/contents/invitados.json';

// Endpoint del Apps Script para recibir RSVPs
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/...';
```

---

## 🎨 Mejoras de diseño pendientes

### Fotos (prioridad alta)
Reemplazar los placeholders con fotos reales de la pareja:
- `photo-hero.jpg` — vertical, mínimo 800×1200px, enfocada en los rostros
- `photo-couple2.jpg` — horizontal o cuadrada, diferente al hero
- `photo-album1.jpg` — la más grande del álbum (puede ser artística)
- `photo-album2.jpg` / `photo-album3.jpg` — detalles o momentos específicos

### Mejoras visuales sugeridas
- [ ] Ajustar opacidad del overlay del hero según la foto real
- [ ] Revisar espaciado entre secciones en pantallas grandes (>768px)
- [ ] Agregar animación de entrada más elaborada para los nombres del hero
- [ ] Considerar paralax sutil en la sección de foto 2
- [ ] Refinar el sello de lacre del sobre (actualmente texto, podría ser SVG)
- [ ] Agregar micro-animación al botón de confirmar asistencia
- [ ] Revisar contraste de texto en sección quote en distintos dispositivos
- [ ] Agregar transición suave entre secciones oscuras y claras

### Funcionalidades opcionales
- [ ] Mensaje diferente en el sobre si el invitado ya confirmó anteriormente
- [ ] Vista de "solo lectura" después de confirmar (ya confirmaste el X de X)
- [ ] Contador de confirmados visible para los novios (dashboard separado)

---

## 🚀 Deploy

- **Hosting:** Netlify (conectado al repo de GitHub)
- **Deploy automático:** cada push a `main` redeploya el sitio
- **Tiempo de deploy:** ~30 segundos

Para actualizar el sitio manualmente: subir archivos al repo en GitHub → Netlify detecta el push y redeploya solo.

---

## 📊 Google Sheets

El archivo de invitados vive en Google Drive e incluye:

- **Hoja Invitados** — lista de invitados (solo llenar NOMBRE, ACOMP., TELÉFONO)
- **Hoja 📋 JSON** — genera el JSON automáticamente para copiar al código (flujo alternativo manual)
- **Hoja RSVPs** — confirmaciones recibidas desde el formulario web
- **Hoja 📖 Cómo usar** — guía paso a paso

El Apps Script sincroniza automáticamente con GitHub cada vez que se edita la hoja.

---

*Boda Estiven & Johana · 13 de Marzo 2026 · San Isidro, Costa Rica 🌿*
