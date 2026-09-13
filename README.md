# Mudanza Casa App (Casa Search)

> **Estado:** ✅ **ACTIVO** — Refactorizado el 13 de septiembre de 2026

Proyecto para buscar y gestionar propiedades para mudanza en Medellín, Colombia.

---

## 📍 Ubicación

- **VPS:** `/home/hermes/mudanza-casa-app`
- **Repositorio Git:** [edavidlink/casa-search](https://github.com/edavidlink/casa-search)
- **Base de datos:** `/home/hermes/mudanza_casa_search.db` (limpia, 0 registros)
- **Respaldo pre-refactor:** `/home/hermes/backups/mudanza_casa_search_pre-refactor_20260913_0930.db`

---

## 🏗️ Estructura del Proyecto

```
mudanza-casa-app/
├── .github/
│   └── workflows/
│       └── deploy.yml.disabled # GitHub Actions (desactivado)
├── backend/
│   ├── main.py                 # API FastAPI principal
│   ├── db.py                   # Conexión SQLite
│   ├── migrate.py              # Migraciones de esquema (idempotente)
│   ├── requirements.txt        # Dependencias Python
│   └── tests/
│       └── test_filtros_e2e.py # Test end-to-end de filtros
├── deploy/
│   ├── Caddyfile               # Reverse proxy
│   └── casa-api.service        # Systemd service
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # App principal
│   │   ├── api.js              # Cliente API
│   │   ├── constants.js        # Opciones de filtros y estados
│   │   └── components/         # Componentes React
│   ├── package.json            # Dependencias NPM
│   └── vite.config.js          # Configuración Vite
├── .gitignore
├── FASE_C_RESUMEN.md
└── PASOS_PAGES_MANUAL.md
```

---

## 🛠️ Tecnologías

### Backend
- **FastAPI** (Python 3.11+)
- **SQLite** (con WAL mode)
- **Uvicorn** (ASGI server)

### Frontend
- **React 19.2.8**
- **Vite 8.2.0**
- **GitHub Pages** (desactivado)

### Deployment
- **Caddy** (reverse proxy)
- **systemd** (service management)

---

## 📊 Base de Datos

Tabla `casa_opciones` (0 registros — estructura lista para nuevos datos):

| Campo | Tipo | Notas |
|-------|------|-------|
| id | INTEGER (PK) | |
| titulo | TEXT | |
| zona | TEXT | |
| tipo_negocio | TEXT | `compra` \| `arriendo` (nuevo) |
| area_m2 | REAL | área puntual |
| area_min / area_max | REAL | rango declarado por el anuncio (nuevo) |
| balcon | INTEGER | cantidad de balcones, 0 = sin balcón (nuevo) |
| estrato | INTEGER | 1 a 6 (nuevo) |
| precio_canon | REAL | canon mensual (arriendo) o precio de venta (compra) |
| descripcion | TEXT | |
| acabados | TEXT | |
| parqueadero | TEXT | texto libre del anuncio (legado, se conserva) |
| parqueadero_num | INTEGER | cantidad de parqueaderos, filtrable (0 = sin parqueadero) |
| cuartos | INTEGER | |
| banos | INTEGER | |
| zona_ropas | TEXT | |
| anio_construccion | INTEGER | |
| distancia_trabajo_km | REAL | |
| status | TEXT | ver `ALLOWED_STATUS` en `main.py` |
| observaciones / comentarios | TEXT | |
| fecha_publicacion / fecha_registro | TEXT | |
| link / portal / contacto | TEXT | |

Índices: `zona`, `status`, `precio_canon`, `tipo_negocio`, `estrato`, `balcon`,
`area_m2`, `parqueadero_num`.

### Migraciones

```bash
cd backend
./.venv/bin/python migrate.py            # aplica columnas/índices faltantes
./.venv/bin/python migrate.py --check    # solo reporta
./.venv/bin/python migrate.py --db otra.db
```

---

## 🔎 API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado, ruta de DB, total de registros, versión |
| GET | `/api/properties` | Listado con filtros |
| GET | `/api/properties/{id}` | Detalle |
| PATCH | `/api/properties/{id}` | Actualiza `status`, `observaciones`, `comentarios` |

### Filtros de `/api/properties`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | texto | Estado de la propiedad |
| `zona` | texto | Zona exacta |
| `tipo_negocio` | `compra` \| `arriendo` | Tipo de negocio |
| `precio_min` / `precio_max` | número | Rango de precio/canon |
| `area_min` / `area_max` | número | Rango de área en m² (por solapamiento de rangos) |
| `balcon` | entero 0..10 | Cantidad exacta de balcones |
| `balcon_min` / `balcon_max` | entero 0..10 | Rango de balcones |
| `estrato` | entero 1..6 | Estrato exacto |
| `estrato_min` / `estrato_max` | entero 1..6 | Rango de estrato |
| `parqueadero_num` | entero 0..10 | Cantidad exacta de parqueaderos |
| `parqueadero_min` / `parqueadero_max` | entero 0..10 | Rango de parqueaderos |
| `q` | texto | Búsqueda en título, zona, descripción y portal |
| `ordenar` | `fecha` \| `precio` \| `-precio` \| `area` \| `-area` \| `distancia` | Orden |
| `limite` / `offset` | entero | Paginación (máx. 200) |

Notas de comportamiento:

- `area_min`/`area_max` comparan el rango pedido contra el rango real de la
  propiedad (`area_min`/`area_max` declarados o `area_m2` puntual): hay match si
  los rangos se cruzan.
- Registros con `balcon`, `estrato` o `parqueadero_num` en `NULL` no aparecen al
  filtrar por esos campos (dato desconocido ≠ 0).
- El filtro de parqueadero usa `parqueadero_num` (cantidad). El campo de texto
  `parqueadero` se conserva como descripción y **no** participa del filtro.
- Rango de canon de arriendo vigente para la búsqueda: **$2.000.000 – $3.000.000**
  (`precio_min`/`precio_max` son libres, así que no hay límite en el código).

### Ejemplos

```bash
# Compra: 60M-80M, 65-90 m², 1-2 balcón, estrato 3-4, 1-2 parqueadero
curl -s "http://localhost:8000/api/properties?tipo_negocio=compra\
&precio_min=60000000&precio_max=80000000&area_min=65&area_max=90\
&balcon_min=1&balcon_max=2&estrato_min=3&estrato_max=4\
&parqueadero_min=1&parqueadero_max=2"

# Arriendo: canon 2M-3M, mismo rango de área/balcón/estrato/parqueadero
curl -s "http://localhost:8000/api/properties?tipo_negocio=arriendo\
&precio_min=2000000&precio_max=3000000&area_min=65&area_max=90\
&balcon_min=1&balcon_max=2&estrato_min=3&estrato_max=4\
&parqueadero_min=1&parqueadero_max=2"
```

---

## 🌐 Acceso

- **Frontend (GitHub Pages):** ⚠️ Desactivado (pendiente, fuera de este refactor)
- **Backend API:** `https://casa-api.169.58.88.103.nip.io` → local `http://127.0.0.1:8000`

---

## 🚀 Comandos

### Backend
```bash
cd backend
./.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
# o vía systemd:
sudo systemctl restart casa-api.service
```

### Tests
```bash
cd backend
./.venv/bin/python tests/test_filtros_e2e.py
```
Usa una DB descartable en `/tmp`; la DB de producción no se toca.

### Frontend
```bash
cd frontend
npm install
npm run dev       # desarrollo
npm run lint      # oxlint
npm run build     # output en frontend/dist/
```

---

## 📝 Estado del Proyecto

**Última actualización:** 13 de septiembre de 2026

**Servicio:** `casa-api.service` activo y habilitado (`systemctl status casa-api`),
sirviendo la versión **1.2.0** de la API.

**Resueltos en esta iteración:**

- ✅ `parqueadero_num` (INTEGER) agregado al esquema + índice, con filtros
  `parqueadero_num`, `parqueadero_min` y `parqueadero_max` en la API.
  El campo de texto `parqueadero` se conserva.
- ✅ Rango de canon de arriendo confirmado: **$2.000.000 – $3.000.000**
  (los filtros `precio_min`/`precio_max` ya son libres).
- ⛔ GitHub Pages **no** desplegado a propósito en esta iteración
  (el workflow sigue en `.github/workflows/deploy.yml.disabled`).

**Pendientes:**

1. Cargar los nuevos candidatos (compra 60M-80M y arriendo canon 2M-3M) con los
   campos `tipo_negocio`, `area_min`/`area_max`, `balcon`, `estrato` y
   `parqueadero_num`.
2. Reactivar GitHub Pages en el repo (lo hace David manualmente).
3. Ejecutar `migrate.py` en cualquier DB nueva antes de usarla (agrega
   `parqueadero_num` si el esquema es viejo).

---

## 📞 Contacto

- **Owner:** [David Link](https://github.com/edavidlink)
- **Proyecto iniciado:** 2026
