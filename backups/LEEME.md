# Backups de la lista de invitados

## ⚠️ Esta carpeta no se toca

`invitados.json` es la lista **definitiva**: 65 invitados, 102 personas.
La llenó Daniel a mano en la hoja de cálculo el 3 de septiembre de 2026.

**Ningún cambio en la página, en los estilos o en el Apps Script debe
modificar `invitados.json` ni los archivos de esta carpeta.** Si un
cambio parece necesitarlo, hay que preguntar primero.

## Por qué existe

`invitados.json` lo sobrescribe el Apps Script cada vez que se edita
una de las columnas A–C de la hoja *Invitados*. Basta con borrar un
nombre por accidente para que la lista viva se quede sin él. Esta
carpeta guarda una copia congelada para poder volver atrás.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `invitados-2026-09-03.json` | Copia byte a byte de `invitados.json` |
| `manifiesto.json` | Fecha, número de invitados y personas, y el SHA-256 de la copia |

La copia es byte a byte, no un re-serializado, para que restaurar
devuelva exactamente lo que había.

## Comprobar que el backup sigue íntegro

```bash
python -c "import hashlib,io,json; m=json.load(io.open('backups/manifiesto.json',encoding='utf-8')); d=io.open('backups/'+m['archivo'],encoding='utf-8').read().encode('utf-8'); print('OK' if hashlib.sha256(d).hexdigest()==m['sha256'] else 'ALTERADO')"
```

## Restaurar

```bash
cp backups/invitados-2026-09-03.json invitados.json
git add invitados.json && git commit -m "restore: lista de invitados desde el backup"
git push
```

Ojo: al restaurar en el repositorio, la hoja de cálculo **no** se
actualiza sola. La hoja es el origen; si la lista viva se corrompió
porque la hoja se corrompió, hay que arreglar la hoja también, o el
siguiente cambio en las columnas A–C volverá a sobrescribir el JSON.
