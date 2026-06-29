# Rediseño Visual — Invitación Boda Estiven & Johana

**Fecha:** 2026-06-28
**Alcance:** Sobre animado + paleta de color + tipografía + mejoras visuales por sección
**Funcionalidad:** No se modifica (RSVP, countdown, carga de invitados.json — todo intacto)

---

## 1. Sobre animado (rediseño completo)

### Librería
- **GSAP 3** via CDN (`https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js`)
- ~50kb adicionales, sin dependencias

### Estructura HTML del sobre
```
#envelope-screen
  .env-wrapper
    .env-scene                  ← perspectiva CSS 3D
      .env-body
        .env-back               ← pliegue inferior visible desde atrás
        .env-fold-left          ← triángulo pliegue lateral izquierdo
        .env-fold-right         ← triángulo pliegue lateral derecho
        .env-flap               ← solapa superior (anima con GSAP rotateX)
        .env-face               ← cara frontal con textura
        .env-seal               ← sello de cera SVG (se desvanece al abrir)
        .env-letter             ← carta blanca que asciende
          .env-letter-eyebrow
          .env-letter-name      ← nombre del invitado (Playfair Display italic)
          .env-letter-sub       ← cupos / "Entrada personal"
  .env-hint                     ← "Toca para abrir" (pulso)
  .env-open-btn                 ← aparece tras apertura
```

### Textura del sobre
- Fondo base: `linear-gradient` multicapa en verde olivo (`#5C6B3A` → `#3A4225`)
- Ruido de textura: SVG `<feTurbulence>` inline (base64 en CSS `background-image`) — sin petición HTTP adicional
- Sombreado de pliegues: triángulos CSS (`border`) que simulan los dobleces laterales e inferior
- Solapa: mismo gradiente de textura con `brightness(0.85)` para diferenciarse

### Sello de cera (SVG)
- Tamaño: 72px × 72px
- Gradiente radial multicapa para efecto metálico dorado:
  ```
  highlight (30% 28%): #f0d87a
  mid:                 #c9a840
  shadow:              #9a7520
  deep:                #6a4e10
  core:                #3d2a06
  ```
- Box-shadow: 3 capas (sombra exterior, inner highlight, inner shadow)
- Contenido: SVG del logo E&J — círculo exterior, iniciales en Playfair Display italic, ramas de olivo SVG simplificadas
- Anillo interior decorativo: `<circle>` con `stroke` sutil

### Secuencia GSAP (Timeline)
```
t=0.0s  usuario toca el sobre
t=0.0s  sello: opacity 1→0, scale 1→0.8  (duration 0.4s, ease: power2.in)
t=0.3s  flap: rotateX 0→-180deg          (duration 0.8s, ease: power2.inOut, transformOrigin: "top center")
t=0.8s  carta: translateY(0)→translateY(-70%)  (duration 0.7s, ease: power2.out)
t=1.2s  botón "Ver invitación": opacity 0→1    (duration 0.4s)
```

Al presionar "Ver invitación":
```
envelope-screen: opacity 1→0             (duration 0.6s)
main-content: opacity 0→1                (duration 0.6s, delay 0.2s)
```

---

## 2. Tipografía

| Rol | Fuente | Variantes |
|-----|--------|-----------|
| Display / Títulos / Nombres | **Playfair Display** | `ital,wght@0,700;1,400;1,700` |
| Cuerpo / UI / Labels | **Jost** | `wght@200;300;400;500` |

**Reemplaza:** Cormorant Garamond → Playfair Display, Raleway → Jost

**Uso:**
- `font-family: var(--font-display)` → Playfair Display, serif
- `font-family: var(--font-body)` → Jost, sans-serif
- Nombres de novios: `font-style: italic; font-weight: 700`
- Eyebrows / labels: Jost 400, `letter-spacing: 0.3em`
- Cuerpo de texto: Jost 300

---

## 3. Paleta de colores (variables CSS actualizadas)

```css
:root {
  --olive:        #5C6B3A;
  --olive-dark:   #3A4225;
  --olive-light:  #8A9A5B;
  --black:        #1A1A18;   /* solo para hero overlay */
  --cream:        #F5F0E8;   /* crema base / carta del sobre */
  --cream-light:  #FDFAF5;   /* fondo principal de secciones claras */
  --cream-alt:    #EEE9DC;   /* fondo de secciones alternas claras */
  --gold:         #C4A962;   /* acentos / countdown / timeline */
  --white:        #FFFFFF;
}
```

---

## 4. Distribución de fondos por sección

| # | Sección | Fondo | Texto primario | Acento |
|---|---------|-------|----------------|--------|
| 0 | Sobre (pantalla) | `olive-dark` + textura | — | — |
| 1 | Hero | foto + overlay `black` | `white` | `gold` |
| 2 | Celebra / Countdown | `cream-light` | `olive-dark` | `olive` |
| 3 | Foto pareja | foto | — | — |
| 4 | Cita | `olive-dark` | `cream` | `gold` |
| 5 | Álbum | `cream-light` | — | — |
| 6 | Ceremonia | `cream-light` | `black` | `olive` |
| 7 | Recepción | `cream-alt` | `black` | `olive` |
| 8 | Itinerario | `olive-dark` | `cream` | `gold` |
| 9 | Regalos | `cream-light` | `olive-dark` | `olive` |
| 10 | Dresscode | `cream-alt` | `black` | `olive` |
| 11 | RSVP | `cream-light` | `olive-dark` | botón `olive` |
| — | Footer | `olive-dark` | `gold` | — |

---

## 5. Mejoras visuales por sección (sin cambiar funcionalidad)

### Sobre
- Rediseño completo descrito en sección 1

### Hero
- Fuentes actualizadas a Playfair Display + Jost
- Sin cambios de layout ni funcionalidad

### Celebra / Countdown
- Fondo: `cream-light`
- Flores: reemplazar emojis 🌸🌼 por SVG inline de ramas de olivo con animación float
- Countdown cells: fondo `olive-dark`, número en `gold` con Playfair Display
- Texto de sección: color `olive-dark`

### Quote
- Fondo: `olive-dark` (en lugar de `#0F0F0D`)
- Comilla decorativa: color `olive-light`
- Texto: `cream`

### Ceremonia y Recepción
- Fondos: `cream-light` / `cream-alt`
- Textos: `black` / `olive-dark`
- Botón Google Maps: borde y color `olive` (en lugar de `gold`)
- Ícono de sección: emoji reemplazable por SVG

### Itinerario
- Fondo: `olive-dark`
- Línea vertical: gradiente `olive` → `olive-light`
- Dots: borde `gold`, fondo `olive-dark`

### Regalos
- Fondo: `cream-light`
- Cards: borde `olive` semitransparente, fondo blanco con sombra sutil
- Íconos de tarjetas: sin cambio

### Dresscode
- Fondo: `cream-alt`
- Cards: borde `olive`, texto `black`
- Paleta de colores: mismos círculos, borde más definido

### RSVP
- Fondo: `cream-light`
- Inputs: borde `olive` semitransparente, fondo blanco
- Label: color `olive`
- Nombre del invitado (display): Playfair Display italic, color `olive-dark`
- Botón submit: fondo `olive`, texto `cream-light`

### Music button
- Fondo: `olive-dark`, borde `gold` — sin cambio

---

## 6. Animaciones adicionales

- **Scroll reveal**: mantener IntersectionObserver, ajustar `transition` a `0.8s cubic-bezier(0.16,1,0.3,1)` para easing más suave
- **Float de ramas**: `@keyframes float` en el SVG de ramas (Celebra)
- **Hover en botones de mapa**: `background olive` + `color cream-light` (en lugar de gold)
- **Submit button**: pulse sutil en hover con `box-shadow`

---

## 7. Archivos modificados

- `index.html` — único archivo a modificar (todo en uno: HTML + CSS + JS)
- Sin archivos nuevos requeridos (la textura del sobre es SVG inline en CSS)

---

## 8. Lo que NO cambia

- Lógica de carga de `invitados.json` desde GitHub API
- Función `loadGuest()` y personalización por URL `?id=`
- Formulario RSVP y endpoint de Google Apps Script
- Countdown timer
- Reproductor de música
- Sistema de scroll reveal (IntersectionObserver)
- Secciones presentes y su orden
- Textos de contenido (nombre iglesia, horarios, dirección, etc.)
