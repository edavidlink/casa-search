from contextlib import asynccontextmanager
from typing import Annotated, Any, Literal

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from db import DB_PATH, get_db, row_to_dict


ALLOWED_STATUS = {
    "pendiente",
    "por_revisar",
    "por_verificar",
    "favorita",
    "descartada",
    "visitada",
    "en_negociacion",
    "aprobada",
}

ALLOWED_TIPO_NEGOCIO = {"compra", "arriendo"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Backend usando DB: {DB_PATH}")
    yield


app = FastAPI(title="Casa Search API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://edavidlink.github.io",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health(conn=Depends(get_db)):
    total = conn.execute("SELECT COUNT(*) AS total FROM casa_opciones").fetchone()[
        "total"
    ]
    return {
        "ok": True,
        "db": DB_PATH,
        "registros": total,
        "version": "1.3.0",
    }


@app.get("/api/properties")
async def list_properties(
    status: Annotated[str | None, Query()] = None,
    zona: Annotated[str | None, Query()] = None,
    tipo_negocio: Annotated[Literal["compra", "arriendo"] | None, Query()] = None,
    precio_min: Annotated[float | None, Query()] = None,
    precio_max: Annotated[float | None, Query()] = None,
    # Habitaciones: "cuartos" es atajo de valor exacto; cuartos_min/cuartos_max rango.
    cuartos: Annotated[int | None, Query(ge=0, le=10)] = None,
    cuartos_min: Annotated[int | None, Query(ge=0, le=10)] = None,
    cuartos_max: Annotated[int | None, Query(ge=0, le=10)] = None,
    # Estrato: "estrato" es atajo de valor exacto; estrato_min/max rango.
    estrato: Annotated[int | None, Query(ge=1, le=6)] = None,
    estrato_min: Annotated[int | None, Query(ge=1, le=6)] = None,
    estrato_max: Annotated[int | None, Query(ge=1, le=6)] = None,
    # Parqueadero: "parqueadero_num" es la cantidad (campo numerico filtrable).
    # "parqueadero" es atajo de valor exacto; parqueadero_min/max rango.
    parqueadero_num: Annotated[int | None, Query(ge=0, le=10)] = None,
    parqueadero_min: Annotated[int | None, Query(ge=0, le=10)] = None,
    parqueadero_max: Annotated[int | None, Query(ge=0, le=10)] = None,
    # Area en m2. Se compara por solapamiento de rangos: una propiedad con
    # area_min/area_max declarados matchea si su rango cruza el pedido.
    area_min: Annotated[float | None, Query(gt=0)] = None,
    area_max: Annotated[float | None, Query(gt=0)] = None,
    q: Annotated[str | None, Query()] = None,
    ordenar: Annotated[
        Literal["precio", "-precio", "area", "-area", "fecha", "distancia"],
        Query(),
    ] = "fecha",
    limite: Annotated[int, Query(ge=1, le=1000)] = 500,
    offset: Annotated[int, Query(ge=0)] = 0,
    conn=Depends(get_db),
):
    where = ["1=1"]
    params: list[Any] = []

    if status:
        where.append("status = ?")
        params.append(status)
    if zona:
        where.append("zona = ?")
        params.append(zona)
    if tipo_negocio:
        where.append("tipo_negocio = ?")
        params.append(tipo_negocio)
    if precio_min is not None:
        where.append("precio_canon >= ?")
        params.append(precio_min)
    if precio_max is not None:
        where.append("precio_canon <= ?")
        params.append(precio_max)

    # Habitaciones: exacto si viene "cuartos", si no el rango pedido.
    cuartos_desde = cuartos if cuartos is not None else cuartos_min
    cuartos_hasta = cuartos if cuartos is not None else cuartos_max
    if cuartos_desde is not None:
        where.append("cuartos >= ?")
        params.append(cuartos_desde)
    if cuartos_hasta is not None:
        where.append("cuartos <= ?")
        params.append(cuartos_hasta)

    estrato_desde = estrato if estrato is not None else estrato_min
    estrato_hasta = estrato if estrato is not None else estrato_max
    if estrato_desde is not None:
        where.append("estrato >= ?")
        params.append(estrato_desde)
    if estrato_hasta is not None:
        where.append("estrato <= ?")
        params.append(estrato_hasta)

    # Parqueadero: exacto si viene "parqueadero_num", si no el rango pedido.
    # Filtra por la cantidad numerica (parqueadero_num), no por el texto libre.
    parqueadero_desde = (
        parqueadero_num if parqueadero_num is not None else parqueadero_min
    )
    parqueadero_hasta = (
        parqueadero_num if parqueadero_num is not None else parqueadero_max
    )
    if parqueadero_desde is not None:
        where.append("parqueadero_num >= ?")
        params.append(parqueadero_desde)
    if parqueadero_hasta is not None:
        where.append("parqueadero_num <= ?")
        params.append(parqueadero_hasta)

    if area_min is not None or area_max is not None:
        # Extremos reales de la propiedad: rango declarado o area puntual.
        extremo_bajo = "COALESCE(area_min, area_max, area_m2)"
        extremo_alto = "COALESCE(area_max, area_min, area_m2)"
        if area_max is not None:
            where.append(f"{extremo_bajo} <= ?")
            params.append(area_max)
        if area_min is not None:
            where.append(f"{extremo_alto} >= ?")
            params.append(area_min)

    if q:
        where.append(
            "(titulo LIKE ? OR zona LIKE ? OR descripcion LIKE ? OR portal LIKE ?)"
        )
        like = f"%{q}%"
        params.extend([like, like, like, like])

    order_map = {
        "precio": "precio_canon ASC",
        "-precio": "precio_canon DESC",
        "area": "area_m2 ASC",
        "-area": "area_m2 DESC",
        "fecha": "fecha_registro DESC",
        "distancia": "distancia_trabajo_km ASC",
    }
    order_clause = order_map.get(ordenar, order_map["fecha"])

    where_sql = " AND ".join(where)

    cur_total = conn.execute(
        f"SELECT COUNT(*) as total FROM casa_opciones WHERE {where_sql}", params
    )
    total = cur_total.fetchone()["total"]

    cur = conn.execute(
        f"""
        SELECT * FROM casa_opciones
        WHERE {where_sql}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
        """,
        params + [limite, offset],
    )
    items = [row_to_dict(row) for row in cur.fetchall()]

    return {"items": items, "total": total}


# Campos aceptados al crear una propiedad.
CREATABLE_FIELDS = {
    "titulo",
    "zona",
    "area_m2",
    "area_min",
    "area_max",
    "precio_canon",
    "descripcion",
    "acabados",
    "parqueadero",
    "parqueadero_num",
    "link",
    "portal",
    "fecha_publicacion",
    "contacto",
    "distancia_trabajo_km",
    "anio_construccion",
    "cuartos",
    "banos",
    "zona_ropas",
    "comentarios",
    "observaciones",
    "tipo_negocio",
    "balcon",
    "estrato",
    "status",
}

# Rangos validos (min, max) para campos numericos enteros.
RANGOS_ENTEROS = {
    "estrato": (1, 6),
    "balcon": (0, 10),
    "parqueadero_num": (0, 10),
    "cuartos": (0, 30),
    "banos": (0, 30),
    "anio_construccion": (1800, 2200),
}


def _validar_numeros(datos: dict[str, Any]) -> None:
    for campo, (minimo, maximo) in RANGOS_ENTEROS.items():
        valor = datos.get(campo)
        if valor is None:
            continue
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            raise HTTPException(
                status_code=422,
                detail=f"'{campo}' debe ser numerico",
            )
        if valor < minimo or valor > maximo:
            raise HTTPException(
                status_code=422,
                detail=f"'{campo}' debe estar entre {minimo} y {maximo}",
            )
    for campo in ("area_m2", "area_min", "area_max", "precio_canon"):
        valor = datos.get(campo)
        if valor is None:
            continue
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            raise HTTPException(
                status_code=422,
                detail=f"'{campo}' debe ser numerico",
            )
        if valor < 0:
            raise HTTPException(
                status_code=422,
                detail=f"'{campo}' no puede ser negativo",
            )


@app.post("/api/properties", status_code=201)
async def create_property(payload: dict[str, Any], conn=Depends(get_db)):
    """Crea una propiedad en la tabla casa_opciones.

    - Solo se aceptan los campos de CREATABLE_FIELDS (el resto se ignora).
    - 'status' por defecto es 'pendiente'.
    - Si se envia 'link' y ya existe una propiedad con ese link, responde 409
      para evitar duplicados en cargas repetidas.
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Se espera un objeto JSON")

    datos = {
        k: v
        for k, v in payload.items()
        if k in CREATABLE_FIELDS and v is not None and v != ""
    }

    if not datos:
        raise HTTPException(
            status_code=422,
            detail=(
                "No hay campos validos. Permitidos: "
                + ", ".join(sorted(CREATABLE_FIELDS))
            ),
        )

    datos.setdefault("status", "pendiente")

    if datos["status"] not in ALLOWED_STATUS:
        raise HTTPException(
            status_code=422,
            detail=f"Status inválido. Permitidos: {', '.join(sorted(ALLOWED_STATUS))}",
        )

    tipo_negocio = datos.get("tipo_negocio")
    if tipo_negocio is not None and tipo_negocio not in ALLOWED_TIPO_NEGOCIO:
        raise HTTPException(
            status_code=422,
            detail=(
                "tipo_negocio inválido. Permitidos: "
                + ", ".join(sorted(ALLOWED_TIPO_NEGOCIO))
            ),
        )

    _validar_numeros(datos)

    link = datos.get("link")
    if link:
        cur = conn.execute(
            "SELECT id FROM casa_opciones WHERE link = ?", (link,)
        )
        existente = cur.fetchone()
        if existente:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Ya existe una propiedad con ese link "
                    f"(id={existente['id']})"
                ),
            )

    columnas = ", ".join(datos.keys())
    marcadores = ", ".join("?" for _ in datos)
    conn.execute(
        f"INSERT INTO casa_opciones ({columnas}) VALUES ({marcadores})",
        list(datos.values()),
    )
    conn.commit()

    nuevo_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    cur = conn.execute("SELECT * FROM casa_opciones WHERE id = ?", (nuevo_id,))
    return row_to_dict(cur.fetchone())


@app.get("/api/properties/{id}")
async def get_property(id: int, conn=Depends(get_db)):
    cur = conn.execute("SELECT * FROM casa_opciones WHERE id = ?", (id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return row_to_dict(row)


@app.patch("/api/properties/{id}")
async def update_property(id: int, patch: dict[str, Any], conn=Depends(get_db)):
    allowed_fields = {"status", "observaciones", "comentarios"}
    updates = {k: v for k, v in patch.items() if k in allowed_fields}

    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")

    if "status" in updates and updates["status"] not in ALLOWED_STATUS:
        raise HTTPException(
            status_code=422,
            detail=f"Status inválido. Permitidos: {', '.join(sorted(ALLOWED_STATUS))}",
        )

    # Verificar existencia
    cur = conn.execute("SELECT id FROM casa_opciones WHERE id = ?", (id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [id]

    conn.execute(
        f"UPDATE casa_opciones SET {set_clause} WHERE id = ?",
        values,
    )
    conn.commit()

    cur = conn.execute("SELECT * FROM casa_opciones WHERE id = ?", (id,))
    row = cur.fetchone()
    return row_to_dict(row)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
