# Rediseño Visual — Invitación Boda E&J

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar visualmente `index.html` — sobre GSAP realista, tipografía Playfair Display + Jost, paleta crema/olivo en secciones — sin tocar nada de la funcionalidad.

**Architecture:** Todo vive en un único `index.html` (HTML + CSS + JS). Se edita en secciones delimitadas por comentarios existentes. La lógica JS (invitados, RSVP, countdown) se preserva intacta. GSAP 3 se carga desde CDN.

**Tech Stack:** HTML/CSS/JS vanilla · GSAP 3.12.5 (CDN) · Google Fonts (Playfair Display + Jost) · SVG inline

---

## Archivos

- Modificar: `index.html` (único archivo)

---

## Task 1: Fuentes y variables CSS

**Files:**
- Modify: `index.html` — `<head>` (link de Google Fonts) y bloque `:root`

- [ ] **Reemplazar el link de Google Fonts** (línea 8-9 del archivo actual) con:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet"/>
```

- [ ] **Reemplazar el bloque `:root`** (actualmente líneas 15-26) con:

```css
:root {
  --olive:        #5C6B3A;
  --olive-dark:   #3A4225;
  --olive-light:  #8A9A5B;
  --black:        #1A1A18;
  --cream:        #F5F0E8;
  --cream-light:  #FDFAF5;
  --cream-alt:    #EEE9DC;
  --gold:         #C4A962;
  --white:        #FFFFFF;

  --font-display: 'Playfair Display', serif;
  --font-body:    'Jost', sans-serif;
}
```

- [ ] **Abrir `index.html` en el navegador**, verificar que los nombres "Estiven & Johana" en el hero se renderizan en Playfair Display italic (letras más altas y contrastadas que antes).

- [ ] **Commit:**
```bash
git add index.html
git commit -m "style: actualizar fuentes a Playfair Display + Jost y variables CSS"
```

---

## Task 2: CSS del sobre — estructura realista

**Files:**
- Modify: `index.html` — sección `/* ENVELOPE SCREEN */` del CSS

- [ ] **Reemplazar todo el bloque CSS** desde `/* ENVELOPE SCREEN */` hasta `/* MAIN CONTENT */` (exclusive) con:

```css
/* ============================================================
   ENVELOPE SCREEN
   ============================================================ */
#envelope-screen {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: radial-gradient(ellipse at 40% 35%, #4a5828 0%, #3A4225 45%, #2a3018 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  transition: opacity 0.7s ease, visibility 0.7s ease;
}
#envelope-screen.hidden { opacity: 0; visibility: hidden; pointer-events: none; }

/* Scene — adds perspective for 3D flap */
.env-scene {
  perspective: 700px;
  perspective-origin: 50% 40%;
}

/* Envelope wrapper */
.env-wrapper {
  position: relative;
  width: min(340px, 88vw);
  cursor: pointer;
  user-select: none;
}

/* Envelope body container */
.env-body {
  width: 100%;
  aspect-ratio: 3/2;
  position: relative;
  filter: drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 8px 16px rgba(0,0,0,0.4));
}

/* Back face (visible through open flap) */
.env-back {
  position: absolute;
  inset: 0;
  border-radius: 3px 3px 7px 7px;
  background: linear-gradient(170deg, #d4c89a 0%, #c8bc8e 40%, #b8a97a 100%);
  z-index: 0;
}

/* Front face with olive texture */
.env-face {
  position: absolute;
  inset: 0;
  border-radius: 3px 3px 7px 7px;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.09'/%3E%3C/svg%3E"),
    linear-gradient(165deg, #7a8c4e 0%, #5C6B3A 25%, #4d6030 55%, #3A4225 80%, #2e3520 100%);
  z-index: 1;
  overflow: hidden;
}

/* Diagonal fold lines on face */
.env-face::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom right, rgba(255,255,255,0.04) 0%, transparent 48%),
    linear-gradient(to bottom left, rgba(255,255,255,0.04) 0%, transparent 48%);
}

/* Left triangular fold */
.env-fold-left {
  position: absolute;
  bottom: 0; left: 0;
  width: 0; height: 0;
  border-bottom: calc(var(--env-h, 150px) * 0.55) solid rgba(40,50,20,0.45);
  border-right: 50% solid transparent;
  z-index: 2;
  pointer-events: none;
}

/* Right triangular fold */
.env-fold-right {
  position: absolute;
  bottom: 0; right: 0;
  width: 0; height: 0;
  border-bottom: calc(var(--env-h, 150px) * 0.55) solid rgba(40,50,20,0.45);
  border-left: 50% solid transparent;
  z-index: 2;
  pointer-events: none;
}

/* Bottom fold */
.env-fold-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  width: 0; height: 0;
  border-left: 50% solid transparent;
  border-right: 50% solid transparent;
  border-bottom: calc(var(--env-h, 150px) * 0.52) solid rgba(55,65,28,0.5);
  z-index: 3;
  pointer-events: none;
}

/* Top flap — animates with GSAP rotationX */
.env-flap {
  position: absolute;
  top: 0; left: 0; right: 0;
  width: 0; height: 0;
  border-left: 50% solid transparent;
  border-right: 50% solid transparent;
  border-top: 52% solid rgba(60,72,32,0.96);
  transform-origin: top center;
  z-index: 5;
  filter: brightness(0.82);
  backface-visibility: hidden;
}

/* Flap texture overlay */
.env-flap::after {
  content: '';
  position: absolute;
  top: 0; left: -50vw; right: -50vw;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* Wax seal */
.env-seal {
  position: absolute;
  top: 46%; left: 50%;
  transform: translate(-50%, -50%);
  width: 72px; height: 72px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 28%, #f5df85 0%, #d4aa3a 28%, #9a7318 55%, #5e420a 78%, #2e1e02 100%);
  box-shadow:
    0 6px 20px rgba(0,0,0,0.65),
    0 2px 6px rgba(0,0,0,0.45),
    inset 0 3px 5px rgba(255,255,255,0.28),
    inset 0 -3px 6px rgba(0,0,0,0.4),
    inset 2px 0 4px rgba(255,230,100,0.12);
  display: flex; align-items: center; justify-content: center;
  z-index: 6;
  cursor: pointer;
}
.env-seal::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1px solid rgba(200,155,20,0.3);
  pointer-events: none;
}
.env-seal-svg {
  width: 48px; height: 48px;
  position: relative; z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
}

/* Letter card that rises from envelope */
.env-letter {
  position: absolute;
  bottom: 4%; left: 8%; right: 8%;
  background: var(--cream-light);
  border-radius: 3px;
  padding: 1.2rem 1rem;
  text-align: center;
  z-index: 4;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
}
.env-letter-eyebrow {
  font-family: var(--font-body);
  font-size: 0.58rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--olive);
  margin-bottom: 0.4rem;
  font-weight: 400;
}
.env-letter-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--black);
  font-style: italic;
  font-weight: 400;
  line-height: 1.2;
}
.env-letter-sub {
  font-family: var(--font-body);
  font-size: 0.62rem;
  color: var(--olive);
  margin-top: 0.3rem;
  letter-spacing: 0.08em;
  font-weight: 300;
}

/* Hint text */
.env-hint {
  margin-top: 1.8rem;
  font-family: var(--font-body);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(245,240,232,0.5);
  animation: pulse 2s ease-in-out infinite;
  font-weight: 300;
}
@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

.env-open-btn {
  margin-top: 2rem;
  padding: 0.85rem 2.4rem;
  background: transparent;
  border: 1.5px solid var(--gold);
  color: var(--gold);
  font-family: var(--font-body);
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s, color 0.2s;
  opacity: 0;
  visibility: hidden;
  font-weight: 400;
}
.env-open-btn:hover { background: var(--gold); color: var(--black); }
```

- [ ] **Abrir en navegador**, verificar que el sobre se ve con textura verde olivo, pliegues triangulares y sello dorado centrado.

- [ ] **Commit:**
```bash
git add index.html
git commit -m "style: rediseño CSS del sobre — textura, pliegues, sello de cera"
```

---

## Task 3: HTML del sobre + SVG del sello de cera

**Files:**
- Modify: `index.html` — sección `<!-- ENVELOPE SCREEN -->` del HTML (body)

- [ ] **Reemplazar el bloque `<div id="envelope-screen">...</div>`** con:

```html
<div id="envelope-screen">
  <div class="env-wrapper" id="env-wrapper">
    <div class="env-scene">
      <div class="env-body" id="env-body">
        <div class="env-back"></div>
        <div class="env-face"></div>
        <div class="env-fold-left"></div>
        <div class="env-fold-right"></div>
        <div class="env-fold-bottom"></div>
        <div class="env-flap" id="env-flap"></div>
        <div class="env-seal" id="env-seal">
          <svg class="env-seal-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <!-- Anillo exterior -->
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(20,12,2,0.35)" stroke-width="0.8"/>
            <!-- Anillo interior -->
            <circle cx="24" cy="24" r="17" fill="none" stroke="rgba(20,12,2,0.2)" stroke-width="0.6"/>
            <!-- Rama de olivo izquierda -->
            <path d="M5 22 Q8 16 10 22" stroke="rgba(15,9,1,0.65)" stroke-width="1" fill="none"/>
            <ellipse cx="6" cy="19" rx="2.2" ry="1.2" fill="rgba(15,9,1,0.6)" transform="rotate(-35 6 19)"/>
            <ellipse cx="8.5" cy="16.5" rx="2" ry="1.1" fill="rgba(15,9,1,0.6)" transform="rotate(-25 8.5 16.5)"/>
            <ellipse cx="4.5" cy="22.5" rx="1.8" ry="1" fill="rgba(15,9,1,0.5)" transform="rotate(-45 4.5 22.5)"/>
            <!-- Rama de olivo derecha -->
            <path d="M43 22 Q40 16 38 22" stroke="rgba(15,9,1,0.65)" stroke-width="1" fill="none"/>
            <ellipse cx="42" cy="19" rx="2.2" ry="1.2" fill="rgba(15,9,1,0.6)" transform="rotate(35 42 19)"/>
            <ellipse cx="39.5" cy="16.5" rx="2" ry="1.1" fill="rgba(15,9,1,0.6)" transform="rotate(25 39.5 16.5)"/>
            <ellipse cx="43.5" cy="22.5" rx="1.8" ry="1" fill="rgba(15,9,1,0.5)" transform="rotate(45 43.5 22.5)"/>
            <!-- Iniciales E & J -->
            <text x="14" y="30" font-family="Georgia,serif" font-style="italic" font-size="16" fill="rgba(15,9,1,0.82)" text-anchor="middle" font-weight="400">E</text>
            <text x="24" y="27" font-family="Georgia,serif" font-style="italic" font-size="9" fill="rgba(15,9,1,0.6)" text-anchor="middle">&amp;</text>
            <text x="34" y="30" font-family="Georgia,serif" font-style="italic" font-size="16" fill="rgba(15,9,1,0.82)" text-anchor="middle" font-weight="400">J</text>
            <!-- Línea decorativa inferior -->
            <line x1="16" y1="36" x2="32" y2="36" stroke="rgba(15,9,1,0.25)" stroke-width="0.6"/>
            <text x="24" y="42" font-family="Georgia,serif" font-size="4" fill="rgba(15,9,1,0.4)" text-anchor="middle" letter-spacing="2">E · J</text>
          </svg>
        </div>
        <div class="env-letter" id="env-letter">
          <p class="env-letter-eyebrow">Invitación especial para</p>
          <p class="env-letter-name" id="guest-name-letter">Estimado invitado</p>
          <p class="env-letter-sub" id="guest-slots-letter"></p>
        </div>
      </div>
    </div>
  </div>
  <p class="env-hint" id="env-hint">Toca el sobre para abrir</p>
  <button class="env-open-btn" id="env-open-btn" onclick="finishEnvelope()">
    Ver invitación →
  </button>
</div>
```

- [ ] **Ajustar la altura dinámica de los pliegues** añadiendo este JS al inicio del bloque `<script>` (antes de cualquier otra línea), para que `--env-h` se actualice con el tamaño real del sobre:

```javascript
// Calcula altura real del sobre para los pliegues CSS
function updateEnvHeight() {
  const body = document.getElementById('env-body');
  if (body) {
    body.style.setProperty('--env-h', body.offsetHeight + 'px');
  }
}
window.addEventListener('resize', updateEnvHeight);
window.addEventListener('DOMContentLoaded', () => { setTimeout(updateEnvHeight, 100); });
```

- [ ] **Verificar en navegador** que el sobre muestra el sello con "E & J" en script, ramas de olivo y anillos. El sello debe verse dorado/metálico con las iniciales oscuras.

- [ ] **Commit:**
```bash
git add index.html
git commit -m "feat: nuevo HTML del sobre con sello SVG E&J y pliegues realistas"
```

---

## Task 4: Animación GSAP — reemplazar lógica de apertura

**Files:**
- Modify: `index.html` — bloque `/* ENVELOPE ANIMATION */` del JS y `<head>` (añadir CDN)

- [ ] **Añadir GSAP CDN** en `<head>`, después del link de Google Fonts:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
```

- [ ] **Reemplazar el bloque `/* ENVELOPE ANIMATION */`** del JS (actualmente el `envWrapper.addEventListener('click', ...)` y `function finishEnvelope()`) con:

```javascript
// ============================================================
// ENVELOPE ANIMATION — GSAP
// ============================================================
const envWrapper   = document.getElementById('env-wrapper');
const envOpenBtn   = document.getElementById('env-open-btn');
const envSeal      = document.getElementById('env-seal');
const envFlap      = document.getElementById('env-flap');
const envLetter    = document.getElementById('env-letter');
const envHint      = document.getElementById('env-hint');

let envelopeOpened = false;

envWrapper.addEventListener('click', () => {
  if (envelopeOpened) return;
  envelopeOpened = true;
  tryStartAudio();

  const tl = gsap.timeline();

  // 1. Pulso de click en el sello
  tl.to(envSeal, {
    scale: 0.92, duration: 0.12, ease: 'power1.in'
  })
  // 2. Sello desaparece
  .to(envSeal, {
    opacity: 0, scale: 0.6, duration: 0.4, ease: 'power2.in'
  })
  // 3. Hint desaparece
  .to(envHint, {
    opacity: 0, duration: 0.3, ease: 'power1.out'
  }, '<')
  // 4. Flap se abre hacia atrás (rotationX en 3D)
  .to(envFlap, {
    rotationX: -185,
    duration: 0.9,
    ease: 'power2.inOut',
    transformOrigin: 'top center',
    transformPerspective: 700
  }, '-=0.15')
  // 5. Carta asciende
  .to(envLetter, {
    y: '-72%',
    duration: 0.75,
    ease: 'power2.out'
  }, '-=0.4')
  // 6. Botón aparece
  .to(envOpenBtn, {
    opacity: 1,
    visibility: 'visible',
    duration: 0.4,
    ease: 'power1.out'
  });
});

function finishEnvelope() {
  const screen = document.getElementById('envelope-screen');
  const main   = document.getElementById('main-content');

  gsap.to(screen, {
    opacity: 0, duration: 0.6, ease: 'power2.inOut',
    onComplete: () => { screen.classList.add('hidden'); }
  });
  gsap.to(main, {
    opacity: 1, duration: 0.7, delay: 0.2, ease: 'power2.out',
    onStart: () => { main.classList.add('visible'); }
  });
}
```

- [ ] **Verificar en navegador:**
  1. El sobre se muestra correctamente en carga
  2. Al tocar: sello hace pulse → desaparece → solapa sube en 3D → carta asciende → botón aparece
  3. Al tocar "Ver invitación": envelope hace fade out, contenido principal hace fade in
  4. El countdown sigue funcionando
  5. La música sigue arrancando al primer toque

- [ ] **Commit:**
```bash
git add index.html
git commit -m "feat: animación de apertura del sobre con GSAP timeline"
```

---

## Task 5: Fondos y colores de secciones

**Files:**
- Modify: `index.html` — bloques CSS de cada sección

- [ ] **Actualizar sección Celebra** — cambiar `background: var(--cream)` por `var(--cream-light)`, y actualizar colores de texto:

```css
.section-celebra {
  background: var(--cream-light);
  color: var(--black);
  padding: 4rem 1.5rem 3rem;
  text-align: center;
}
.section-eyebrow {
  font-size: 0.63rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--olive);
  margin-bottom: 0.5rem;
  font-weight: 400;
}
.section-title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 7vw, 2.8rem);
  font-weight: 400;
  font-style: italic;
  line-height: 1.2;
  color: var(--olive-dark);
  margin-bottom: 0.5rem;
}
.section-sub {
  font-size: 0.75rem;
  color: var(--olive);
  letter-spacing: 0.05em;
  margin-bottom: 2rem;
  font-weight: 300;
}
```

- [ ] **Actualizar sección Quote** — `background: #0F0F0D` → `var(--olive-dark)`:

```css
.section-quote {
  background: var(--olive-dark);
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.section-quote::before {
  content: '\201C';
  font-family: var(--font-display);
  font-size: 14rem;
  color: var(--olive-light);
  position: absolute;
  top: -2rem; left: 0.5rem;
  line-height: 1;
  opacity: 0.2;
  pointer-events: none;
}
```

- [ ] **Actualizar sección Album** — `background: var(--black)` → `var(--cream-light)`:

```css
.section-album {
  background: var(--cream-light);
  padding: 2rem 1rem;
}
.album-grid > div {
  overflow: hidden;
  border-radius: 4px;
  background: var(--olive);
}
```

- [ ] **Actualizar sección Ceremony** — `background` implícito negro → `var(--cream-light)`:

```css
.section-event {
  padding: 3.5rem 1.5rem;
  text-align: center;
  border-top: 1px solid rgba(92,107,58,0.12);
  background: var(--cream-light);
}
.section-event.alt {
  background: var(--cream-alt);
}
```

- [ ] **Actualizar sección Timeline** — `background: #0F0F0D` → `var(--olive-dark)`:

```css
.section-timeline {
  background: var(--olive-dark);
  padding: 3.5rem 1.5rem;
}
```

- [ ] **Actualizar sección Gifts** — `background: var(--olive-dark)` → `var(--cream-light)`:

```css
.section-gifts {
  background: var(--cream-light);
  padding: 3.5rem 1.5rem;
  text-align: center;
}
```

- [ ] **Actualizar sección Dresscode** — `background: var(--black)` → `var(--cream-alt)`:

```css
.section-dress {
  background: var(--cream-alt);
  padding: 3.5rem 1.5rem;
  text-align: center;
}
```

- [ ] **Actualizar sección RSVP** — `background: var(--olive-dark)` → `var(--cream-light)`:

```css
.section-rsvp {
  background: var(--cream-light);
  padding: 3.5rem 1.5rem 4rem;
  text-align: center;
}
```

- [ ] **Actualizar Footer** — mantener `var(--black)` → cambiar a `var(--olive-dark)`:

```css
.footer {
  background: var(--olive-dark);
  text-align: center;
  padding: 2rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
}
```

- [ ] **Verificar en navegador** scrolleando toda la página: las secciones alternan entre crema claro, crema alt y olivo oscuro sin negros.

- [ ] **Commit:**
```bash
git add index.html
git commit -m "style: actualizar fondos de secciones a paleta crema/olivo"
```

---

## Task 6: Componentes en secciones claras — textos, botones, formulario

**Files:**
- Modify: `index.html` — bloques CSS de event, countdown, gifts, dress, rsvp

- [ ] **Actualizar estilos de eventos (Ceremonia/Recepción)** para secciones claras:

```css
.event-eyebrow {
  font-size: 0.6rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--olive);
  margin-bottom: 0.4rem;
  font-weight: 400;
}
.event-name {
  font-family: var(--font-display);
  font-size: 1.7rem;
  font-style: italic;
  color: var(--black);
  margin-bottom: 0.3rem;
}
.event-time {
  font-family: var(--font-display);
  font-size: 2.4rem;
  color: var(--olive);
  font-weight: 400;
  margin-bottom: 0.4rem;
}
.event-address {
  font-size: 0.75rem;
  color: rgba(26,26,24,0.6);
  line-height: 1.7;
  margin-bottom: 1.4rem;
  font-weight: 300;
}
.map-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.6rem;
  border: 1.5px solid var(--olive);
  color: var(--olive);
  font-family: var(--font-body);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 2px;
  transition: background 0.2s, color 0.2s;
  font-weight: 400;
}
.map-btn:hover { background: var(--olive); color: var(--cream-light); }
```

- [ ] **Actualizar countdown cells** para fondo olivo-dark + número en gold:

```css
.countdown-cell {
  background: var(--olive-dark);
  color: var(--cream);
  border-radius: 6px;
  padding: 0.8rem 0.4rem;
}
.countdown-num {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
  display: block;
  font-style: italic;
}
.countdown-label {
  font-family: var(--font-body);
  font-size: 0.52rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.7;
  display: block;
  margin-top: 0.3rem;
  font-weight: 300;
}
```

- [ ] **Actualizar gift cards** para secciones claras:

```css
.gift-card {
  background: var(--white);
  border: 1px solid rgba(92,107,58,0.2);
  border-radius: 8px;
  padding: 1.2rem 0.8rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(92,107,58,0.06);
}
.gift-card-label {
  font-size: 0.68rem;
  color: var(--olive-dark);
  letter-spacing: 0.08em;
  font-weight: 400;
}
.gift-card-value {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--olive);
  font-style: italic;
}
.gifts-note {
  font-size: 0.72rem;
  color: rgba(26,26,24,0.5);
  margin-top: 1.5rem;
  line-height: 1.7;
  max-width: 30ch;
  margin-left: auto; margin-right: auto;
  font-weight: 300;
}
```

- [ ] **Actualizar dresscode cards** para fondo crema:

```css
.dress-card {
  border: 1px solid rgba(92,107,58,0.2);
  border-radius: 8px;
  padding: 1.5rem 1rem;
  background: var(--white);
}
.dress-card-gender {
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--olive);
  margin-bottom: 0.5rem;
  font-weight: 400;
}
.dress-card-items {
  font-size: 0.72rem;
  color: rgba(26,26,24,0.65);
  line-height: 1.8;
  list-style: none;
  font-weight: 300;
}
.dress-color {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(26,26,24,0.12);
}
.dress-colors-label {
  font-size: 0.63rem;
  color: rgba(26,26,24,0.45);
  margin-top: 0.8rem;
  letter-spacing: 0.1em;
  font-weight: 300;
}
```

- [ ] **Actualizar RSVP form** para secciones claras:

```css
.rsvp-form {
  max-width: 400px;
  margin: 2rem auto 0;
  text-align: left;
}
.form-label {
  display: block;
  font-size: 0.62rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--olive);
  margin-bottom: 0.4rem;
  font-weight: 400;
}
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  background: var(--white);
  border: 1px solid rgba(92,107,58,0.25);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  color: var(--black);
  font-family: var(--font-body);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  appearance: none;
  font-weight: 300;
}
.form-input:focus,
.form-select:focus,
.form-textarea:focus { border-color: var(--olive); }
.form-select option { background: var(--white); color: var(--black); }
.form-textarea { resize: none; height: 90px; }

.rsvp-name-display {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(92,107,58,0.05);
  border: 1px solid rgba(92,107,58,0.15);
  border-radius: 4px;
  color: var(--olive-dark);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-style: italic;
  letter-spacing: 0.02em;
}
.companion-row input {
  flex: 1;
  background: var(--white);
  border: 1px solid rgba(92,107,58,0.2);
  border-radius: 4px;
  padding: 0.6rem 0.8rem;
  color: var(--black);
  font-family: var(--font-body);
  font-size: 0.82rem;
  outline: none;
  font-weight: 300;
}
.companion-row input:focus { border-color: var(--olive); }
.companion-num-label {
  font-size: 0.7rem;
  color: rgba(26,26,24,0.45);
  margin-bottom: 0.6rem;
  line-height: 1.5;
  font-weight: 300;
}
.submit-btn {
  width: 100%;
  padding: 1rem;
  background: var(--olive);
  border: none;
  border-radius: 4px;
  color: var(--cream-light);
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s;
}
.submit-btn:hover { background: var(--olive-dark); }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* RSVP section titles en sección clara */
.section-rsvp .section-title { color: var(--olive-dark); }
.section-rsvp .section-sub   { color: rgba(26,26,24,0.55); }
```

- [ ] **Verificar en navegador**: formulario RSVP con fondo blanco, labels verde olivo, botón verde olivo. Probar seleccionar "Sí" para verificar que los inputs dinámicos de acompañantes se siguen mostrando correctamente.

- [ ] **Commit:**
```bash
git add index.html
git commit -m "style: actualizar componentes de secciones claras (evento, form, gifts, dress)"
```

---

## Task 7: SVG flores olivo + Gifts en grid de 4 + sección Gifts título

**Files:**
- Modify: `index.html` — HTML de la sección Celebra, CSS flowers, HTML sección Gifts title

- [ ] **Reemplazar la línea de flores emoji** en el HTML de la sección Celebra:

Reemplazar:
```html
<div class="flowers-row reveal">🌸 🌼 🌷 🌼 🌸</div>
```

Con:
```html
<div class="flowers-row reveal" aria-hidden="true">
  <svg class="olive-branch" viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 32 Q20 20 35 28 Q48 18 60 24 Q68 20 72 14" stroke="#5C6B3A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="18" cy="23" rx="5" ry="2.8" fill="#8A9A5B" transform="rotate(-30 18 23)"/>
    <ellipse cx="28" cy="19" rx="5" ry="2.8" fill="#5C6B3A" transform="rotate(-20 28 19)"/>
    <ellipse cx="40" cy="22" rx="5" ry="2.8" fill="#8A9A5B" transform="rotate(-15 40 22)"/>
    <ellipse cx="52" cy="19" rx="5" ry="2.8" fill="#5C6B3A" transform="rotate(-10 52 19)"/>
    <ellipse cx="63" cy="17" rx="4.5" ry="2.5" fill="#8A9A5B" transform="rotate(-20 63 17)"/>
    <!-- Olivas -->
    <circle cx="22" cy="26" r="2.2" fill="#3A4225"/>
    <circle cx="45" cy="25" r="2" fill="#3A4225"/>
    <circle cx="66" cy="20" r="1.8" fill="#3A4225"/>
  </svg>
</div>
```

- [ ] **Actualizar CSS `.flowers-row`**:

```css
.flowers-row {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  animation: float-flowers 3.5s ease-in-out infinite;
}
.olive-branch {
  width: 160px;
  height: 50px;
  opacity: 0.85;
}
@keyframes float-flowers {
  0%,100%{ transform: translateY(0) rotate(-1deg); }
  50%{ transform: translateY(-6px) rotate(1deg); }
}
```

- [ ] **Actualizar título de sección Gifts** para que use colores oscuros (estaba con `style="color:var(--cream)"`):

En el HTML de la sección Gifts, reemplazar:
```html
<h2 class="section-title reveal" style="color:var(--cream)">Lista de regalos</h2>
<p class="section-sub reveal" style="color:rgba(245,240,232,0.6)">
```
Con:
```html
<h2 class="section-title reveal">Lista de regalos</h2>
<p class="section-sub reveal">
```

- [ ] **Hacer lo mismo en la sección RSVP** — quitar los `style` inline que forzaban colores claros:

Reemplazar:
```html
<h2 class="section-title reveal" style="color:var(--cream)">Confirma tu asistencia</h2>
<p class="section-sub reveal" style="color:rgba(245,240,232,0.65)">
```
Con:
```html
<h2 class="section-title reveal">Confirma tu asistencia</h2>
<p class="section-sub reveal">
```

- [ ] **Verificar en navegador**: ramas de olivo SVG animadas en sección Celebra, títulos de Gifts y RSVP en colores oscuros correctos.

- [ ] **Commit:**
```bash
git add index.html
git commit -m "style: ramas de olivo SVG animadas, colores inline removidos"
```

---

## Task 8: Timeline y Hero — tipografía y colores finales

**Files:**
- Modify: `index.html` — CSS sección timeline, CSS hero

- [ ] **Actualizar estilos del timeline** para sección olivo oscuro:

```css
.timeline-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-style: italic;
  text-align: center;
  color: var(--cream);
  margin-bottom: 2.5rem;
  font-weight: 400;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--gold) 15%, var(--gold) 85%, transparent);
}
.timeline-dot {
  position: absolute;
  left: -2rem;
  top: 0.1rem;
  width: 32px; height: 32px;
  background: var(--olive-dark);
  border: 1.5px solid var(--gold);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem;
}
.timeline-time {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--gold);
  font-style: italic;
}
.timeline-label {
  font-size: 0.8rem;
  color: var(--cream);
  font-weight: 400;
  margin: 0.1rem 0;
}
.timeline-desc {
  font-size: 0.68rem;
  color: rgba(245,240,232,0.5);
  line-height: 1.5;
  font-weight: 300;
}
```

- [ ] **Actualizar hero** con tipografía Playfair Display (ya hereda la variable pero ajustar tamaños):

```css
.hero-eyebrow {
  font-family: var(--font-body);
  font-size: 0.66rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 0.8rem;
  font-weight: 300;
}
.hero-names {
  font-family: var(--font-display);
  font-size: clamp(3rem, 12vw, 5rem);
  font-weight: 700;
  font-style: italic;
  line-height: 1;
  color: var(--white);
  letter-spacing: -0.01em;
}
.hero-names .amp {
  font-style: italic;
  font-weight: 400;
  color: var(--gold);
  display: block;
  font-size: 0.5em;
  margin: 0.15em 0;
}
.hero-date {
  margin-top: 1.2rem;
  font-family: var(--font-body);
  font-size: 0.7rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(245,240,232,0.6);
  font-weight: 200;
}
```

- [ ] **Actualizar Footer** tipografía:

```css
.footer-names {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 400;
  color: var(--gold);
}
.footer-date {
  font-family: var(--font-body);
  font-size: 0.63rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(245,240,232,0.35);
  margin-top: 0.4rem;
  font-weight: 200;
}
```

- [ ] **Actualizar música button** — adaptar a nueva paleta:

```css
#music-btn {
  position: fixed;
  bottom: 1.4rem;
  left: 1.4rem;
  z-index: 999;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(58,66,37,0.92);
  border: 1.5px solid rgba(196,169,98,0.5);
  color: var(--gold);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  transition: background 0.2s;
  backdrop-filter: blur(4px);
}
#music-btn:hover { background: var(--olive); }
#music-btn.muted { opacity: 0.45; }
```

*(Nota: se movió de right a left para que no tape el botón de mapa en móvil)*

- [ ] **Actualizar el scroll reveal** con easing más suave:

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in { opacity: 1; transform: translateY(0); }
```

- [ ] **Verificar en navegador** scroll completo: hero → celebra → quote → ceremonia → recepción → itinerario → regalos → dresscode → RSVP → footer. Confirmar que todos los textos son legibles y los colores alternan correctamente.

- [ ] **Probar en móvil** (DevTools responsive mode, iPhone SE 375px): que el sobre encaje, los textos se lean bien y los botones sean fáciles de tocar.

- [ ] **Commit final:**
```bash
git add index.html
git commit -m "style: tipografía hero/timeline/footer + music btn + scroll reveal easing"
```

---

## Task 9: Verificación completa y push

- [ ] **Abrir la URL de producción preview** (`index.html` localmente o en Netlify preview) con el link `?id=demo` y verificar el flujo completo:
  1. Se muestra el sobre con textura verde olivo y sello de cera E&J
  2. Al tocar: animación GSAP — sello desaparece, flap sube, carta asciende con "Invitado Demo"
  3. Al tocar "Ver invitación →": fade out sobre, fade in contenido
  4. Countdown funciona (números cambian cada segundo)
  5. Scroll reveal: cada sección aparece al hacer scroll
  6. Secciones en crema claro: Celebra, Album, Ceremonia, Recepción, Gifts, Dresscode, RSVP
  7. Secciones en olivo oscuro: Quote, Timeline, Footer
  8. Formulario RSVP: seleccionar "Sí" muestra selector de acompañantes — verificar que funciona
  9. Música: ícono ♪ arranca audio al primer toque del sobre

- [ ] **Verificar en DevTools** que no hay errores JS en consola

- [ ] **Push a main:**
```bash
git push origin main
```

- [ ] **Verificar deploy en Netlify** (~30s) abriendo `https://invitacionesbodaej.netlify.app/?id=demo`
