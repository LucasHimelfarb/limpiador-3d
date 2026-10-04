# Limpiador 3D

Juego 3D de escritorio (Electron + Three.js): manejás a un personaje con un trapeador dentro de un habitáculo y tenés que dejar el piso limpio antes de que se acabe el tiempo. Cada mancha que limpiás suma puntos.

## Cómo jugar

| Tecla | Acción |
| --- | --- |
| `W` `A` `S` `D` / flechas | Moverse |
| `Espacio` (mantener) | Fregar más fuerte (te movés más lento) |
| `E` junto al balde azul | Mojar el trapeador |
| `P` | Pausa |
| `Enter` | Empezar / siguiente nivel |

- El trapeador gasta agua a medida que limpia; cuando se seca no limpia más, así que hay que volver al balde.
- Cada nivel tiene una meta de piso limpio (80% en el nivel 1, sube con cada nivel) y un tiempo límite.
- Si llegás al 99% el nivel termina en el acto y te llevás el bonus por piso impecable más el bonus por el tiempo que sobró.
- Si se acaba el tiempo sin llegar a la meta, perdés.

### Puntaje

- Limpiar todo el piso de un nivel vale 1000 puntos (se suman de a 10 mientras limpiás).
- +100 al alcanzar la meta.
- Bonus por porcentaje por encima de la meta.
- +10 por cada segundo que sobre y +500 si dejás el piso impecable.

## Correrlo

Requiere Node.js 18+.

```bash
npm install
npm start
```

También se puede jugar en el navegador:

```bash
npm install
npm run web
# abrir http://localhost:8080
```
