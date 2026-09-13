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
    allow_methods=["GET", "PATCH", "OPTIONS"],
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
        "version": "1.2.0",
    }


@app.get("/api/properties")
async def list_properties(
    status: Annotated[str | None, Query()] = None,
    zona: Annotated[str | None, Query()] = None,
    tipo_negocio: Annotated[Literal["compra", "arriendo"] | None, Query()] = None,
    precio_min: Annotated[float | None, Query()] = None,
    precio_max: Annotated[float | None, Query()] = None,
    # Balcon: "balcon" es atajo de valor exacto; balcon_min/balcon_max rango.
    balcon: Annotated[int | None, Query(ge=0, le=10)] = None,
    balcon_min: Annotated[int | None, Query(ge=0, le=10)] = None,
    balcon_max: Annotated[int | None, Query(ge=0, le=10)] = None,
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
    limite: Annotated[int, Query(ge=1, le=200)] = 100,
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

    # Balcon: exacto si viene "balcon", si no el rango pedido.
    balcon_desde = balcon if balcon is not None else balcon_min
    balcon_hasta = balcon if balcon is not None else balcon_max
    if balcon_desde is not None:
        where.append("balcon >= ?")
        params.append(balcon_desde)
    if balcon_hasta is not None:
        where.append("balcon <= ?")
        params.append(balcon_hasta)

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
