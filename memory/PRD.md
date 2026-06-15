# PRD — Rutas Eficientes (Google My Maps)

## Problema (original del usuario, ES)
"Haz una página donde se vea un mapa de Google My Maps y genere rutas eficientes entre distintos puntos para hacer un recorrido en un día (y haz que deje modificar los pesos de los eventos según su categoría para poder calcular cuántos eventos se pueden hacer)"

## Decisiones del usuario
- Mapa: Google My Maps (importar KML público + embed iframe)
- Entrada de puntos: importación desde URL pública de Google My Maps
- Categorías: predefinidas + editables (peso y duración)
- Algoritmo: combinado — maximizar suma de pesos dentro de un tiempo límite + minimizar distancia entre paradas (greedy de valor-densidad + 2-opt)
- Persistencia: MongoDB

## Arquitectura
- Backend: FastAPI + Motor (MongoDB), `httpx` para descargar el KML
- Frontend: React + Tailwind + Shadcn UI, sonner para toasts
- Layout 3 columnas (control room): Settings | Mapa+KPIs | Itinerario
- Tema claro (stone/orange/emerald), tipografía Work Sans + IBM Plex Sans

## Endpoints
- `GET /api/categories` → categorías por defecto
- `POST /api/import-kml { url }` → embed_url + puntos (auto-categorizados por keyword)
- `POST /api/optimize-route` → stops ordenados con tiempos, distancia, peso, skipped
- `POST /api/itineraries` / `GET` / `GET/{id}` / `DELETE/{id}`

## Implementado (Feb 2026)
- Importación KML desde My Maps público, extracción de placemarks (nombre, coords, descripción)
- Auto-categorización por keywords del nombre (museo/parque/monumento/restaurante/...)
- Editor de pesos por categoría (slider 0–10) + duración por categoría
- Slider horas disponibles, slider velocidad (presets a pie / bici / coche)
- Switch volver al inicio
- Greedy value-density + mejora 2-opt para minimizar viaje
- Vista embed My Maps + KPIs (paradas, valor, distancia, duración)
- Itinerario timeline numerado con horarios estimados, badge categoría y descripción
- Lista de paradas omitidas
- Guardar/Cargar/Borrar itinerarios en MongoDB
- Empty state con mapa vintage

## Limitaciones conocidas
- Distancia es haversine (línea recta) — buen estimado para a-pie/ciudad
- El KML de My Maps solo funciona con mapas marcados como "público"
- Embed solo muestra el mapa original, no la ruta optimizada (esa se ve en el itinerario)

## Backlog futuro (P1)
- Permitir crear/editar puntos manualmente
- Pintar la ruta optimizada sobre un mapa Leaflet adicional
- Exportar itinerario a PDF / Google Calendar
- Recalcular distancias reales vía OSRM (carretera o caminata)
- Multi-día (varios días, hoteles intermedios)

## Personas
- Turista que arma su día en una ciudad nueva
- Guía que organiza recorridos para grupos
- Local que cura mapas temáticos (food tour, ruta artística)
