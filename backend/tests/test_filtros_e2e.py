"""Test end-to-end de los filtros nuevos de la API.

Levanta una instancia temporal de uvicorn contra una DB de prueba
(descartable, en /tmp) con filas de fixture, y verifica cada filtro.
La DB real NO se toca (se verifica al final).

Uso:
    ./.venv/bin/python tests/test_filtros_e2e.py
"""

from __future__ import annotations

import json
import os
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from db import DB_PATH  # noqa: E402  (DB de produccion, solo para verificar)
from migrate import migrate  # noqa: E402

FIXTURES = [
    # id 1: compra, area puntual, 2 balcones, estrato 4, 2 parqueaderos
    {
        "id": 1,
        "titulo": "Compra 85m2 con 2 balcones",
        "tipo_negocio": "compra",
        "area_m2": 85.0,
        "area_min": None,
        "area_max": None,
        "balcon": 2,
        "estrato": 4,
        "parqueadero_num": 2,
        "parqueadero": "2 cubiertos",
        "precio_canon": 70_000_000,
    },
    # id 2: compra con rango declarado 65-90 m2, 1 parqueadero
    {
        "id": 2,
        "titulo": "Compra rango 65-90m2",
        "tipo_negocio": "compra",
        "area_m2": None,
        "area_min": 65.0,
        "area_max": 90.0,
        "balcon": 1,
        "estrato": 3,
        "parqueadero_num": 1,
        "parqueadero": "1",
        "precio_canon": 60_000_000,
    },
    # id 3: arriendo con 2 parqueaderos
    {
        "id": 3,
        "titulo": "Arriendo 70m2",
        "tipo_negocio": "arriendo",
        "area_m2": 70.0,
        "area_min": None,
        "area_max": None,
        "balcon": 2,
        "estrato": 3,
        "parqueadero_num": 2,
        "parqueadero": "2",
        "precio_canon": 2_500_000,
    },
    # id 4: arriendo sin balcon y sin parqueadero (0, no NULL)
    {
        "id": 4,
        "titulo": "Arriendo 55m2 sin balcon",
        "tipo_negocio": "arriendo",
        "area_m2": 55.0,
        "area_min": None,
        "area_max": None,
        "balcon": 0,
        "estrato": 2,
        "parqueadero_num": 0,
        "parqueadero": "no tiene",
        "precio_canon": 2_200_000,
    },
    # id 5: sin datos nuevos; el TEXTO dice "2 parqueaderos" pero
    # parqueadero_num es NULL -> no debe aparecer en filtros numericos.
    {
        "id": 5,
        "titulo": "Arriendo sin datos nuevos",
        "tipo_negocio": "arriendo",
        "area_m2": 80.0,
        "area_min": None,
        "area_max": None,
        "balcon": None,
        "estrato": None,
        "parqueadero_num": None,
        "parqueadero": "2 parqueaderos",
        "precio_canon": 1_400_000,
    },
    # id 6: compra con 3 parqueaderos
    {
        "id": 6,
        "titulo": "Compra 95m2 3 balcones",
        "tipo_negocio": "compra",
        "area_m2": 95.0,
        "area_min": None,
        "area_max": None,
        "balcon": 3,
        "estrato": 5,
        "parqueadero_num": 3,
        "parqueadero": "3",
        "precio_canon": 120_000_000,
    },
]

results: list[tuple[bool, str, str]] = []


def check(ok: bool, nombre: str, detalle: str = "") -> None:
    results.append((ok, nombre, detalle))
    print(f"  {'PASS' if ok else 'FAIL'}  {nombre}" + (f"  -> {detalle}" if detalle else ""))


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def build_fixture_db() -> str:
    fd, path = tempfile.mkstemp(prefix="casa_test_", suffix=".db")
    os.close(fd)
    os.unlink(path)

    # Partimos del esquema real: la DB de fixtures se crea con migrate.py
    # sobre una copia de la estructura actual (sin filas).
    src = sqlite3.connect(DB_PATH)
    try:
        ddl = src.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='casa_opciones'"
        ).fetchone()[0]
        indexes = [
            r[0]
            for r in src.execute(
                "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
            )
        ]
    finally:
        src.close()

    conn = sqlite3.connect(path)
    try:
        conn.execute(ddl)
        for idx in indexes:
            conn.execute(idx)
        conn.commit()
    finally:
        conn.close()

    # La copia de la estructura puede venir de un DDL viejo: migrate()
    # garantiza las columnas/índices nuevos ANTES de insertar fixtures.
    migrate(path)

    conn = sqlite3.connect(path)
    try:
        conn.executemany(
            """
            INSERT INTO casa_opciones
                (id, titulo, tipo_negocio, area_m2, area_min, area_max,
                 balcon, estrato, parqueadero_num, parqueadero, precio_canon,
                 cuartos, banos, status)
            VALUES (:id, :titulo, :tipo_negocio, :area_m2, :area_min, :area_max,
                    :balcon, :estrato, :parqueadero_num, :parqueadero,
                    :precio_canon, 2, 2, 'pendiente')
            """,
            FIXTURES,
        )
        conn.commit()
    finally:
        conn.close()

    return path


def get(base: str, endpoint: str, params: dict[str, Any] | None = None) -> tuple[int, Any]:
    url = f"{base}{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"null")


def ids(payload: dict[str, Any]) -> list[int]:
    return sorted(i["id"] for i in payload.get("items", []))


def main() -> int:
    print("== Filtros de la API Casa Search (DB de prueba descartable) ==\n")
    db_test = build_fixture_db()
    port = free_port()
    base = f"http://127.0.0.1:{port}"

    env = {**os.environ, "CASA_DB_PATH": db_test}
    proc = subprocess.Popen(
        [
            str(BACKEND / ".venv" / "bin" / "python"),
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=str(BACKEND),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    try:
        for _ in range(60):
            try:
                status, _ = get(base, "/api/health")
                if status == 200:
                    break
            except Exception:
                time.sleep(0.25)
        else:
            proc.terminate()
            out = proc.stdout.read().decode() if proc.stdout else ""
            print("ERROR: la API de prueba no arranco")
            print(out[-2000:])
            return 1

        print(f"API de prueba en {base} (DB: {db_test})\n")

        # --- tipo_negocio -------------------------------------------------
        st, data = get(base, "/api/properties", {"tipo_negocio": "compra"})
        check(st == 200 and ids(data) == [1, 2, 6], "tipo_negocio=compra", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"tipo_negocio": "arriendo"})
        check(st == 200 and ids(data) == [3, 4, 5], "tipo_negocio=arriendo", f"ids={ids(data)}")

        st, _ = get(base, "/api/properties", {"tipo_negocio": "venta"})
        check(st == 422, "tipo_negocio invalido -> 422", f"status={st}")

        # --- area (rango puntual y rango declarado) -----------------------
        st, data = get(base, "/api/properties", {"area_min": 65, "area_max": 90})
        check(st == 200 and ids(data) == [1, 2, 3, 5],
              "area_min=65 area_max=90 (solapa rango 65-90)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"area_min": 80, "area_max": 100})
        # 1(85) y 5(80) por area puntual; 2(65-90) porque su rango cruza;
        # 6(95) por area puntual.
        check(st == 200 and ids(data) == [1, 2, 5, 6],
              "area_min=80 area_max=100 (rango declarado 65-90 cruza)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"area_max": 60})
        check(st == 200 and ids(data) == [4], "area_max=60 solo", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"area_min": 96})
        check(st == 200 and ids(data) == [], "area_min=96 -> vacio", f"ids={ids(data)}")

        # --- balcon -------------------------------------------------------
        st, data = get(base, "/api/properties", {"balcon_min": 1, "balcon_max": 2})
        check(st == 200 and ids(data) == [1, 2, 3],
              "balcon_min=1 balcon_max=2 (NULL excluido)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"balcon": 2})
        check(st == 200 and ids(data) == [1, 3], "balcon=2 exacto", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"balcon": 0})
        check(st == 200 and ids(data) == [4], "balcon=0 (sin balcon)", f"ids={ids(data)}")

        # --- estrato ------------------------------------------------------
        st, data = get(base, "/api/properties", {"estrato_min": 3, "estrato_max": 4})
        check(st == 200 and ids(data) == [1, 2, 3],
              "estrato_min=3 estrato_max=4 (NULL excluido)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"estrato": 3})
        check(st == 200 and ids(data) == [2, 3], "estrato=3 exacto", f"ids={ids(data)}")

        st, _ = get(base, "/api/properties", {"estrato_min": 9})
        check(st == 422, "estrato_min=9 -> 422", f"status={st}")

        # --- parqueadero_num ----------------------------------------------
        st, data = get(base, "/api/properties", {"parqueadero_min": 1, "parqueadero_max": 2})
        check(st == 200 and ids(data) == [1, 2, 3],
              "parqueadero_min=1 parqueadero_max=2 (0 y NULL excluidos)",
              f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"parqueadero_num": 2})
        check(st == 200 and ids(data) == [1, 3], "parqueadero_num=2 exacto", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"parqueadero_num": 1})
        check(st == 200 and ids(data) == [2], "parqueadero_num=1 exacto", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"parqueadero_num": 0})
        check(st == 200 and ids(data) == [4],
              "parqueadero_num=0 (sin parqueadero)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"parqueadero_min": 3})
        check(st == 200 and ids(data) == [6], "parqueadero_min=3 solo", f"ids={ids(data)}")

        # id 5 tiene el TEXTO "2 parqueaderos" pero parqueadero_num NULL:
        # el filtro numerico se apoya en la columna, no en el texto libre.
        st, data = get(base, "/api/properties", {"parqueadero_min": 1})
        check(st == 200 and 5 not in ids(data),
              "parqueadero numerico ignora el texto libre de `parqueadero`",
              f"ids={ids(data)}")

        st, _ = get(base, "/api/properties", {"parqueadero_min": 11})
        check(st == 422, "parqueadero_min=11 -> 422", f"status={st}")

        st, _ = get(base, "/api/properties", {"parqueadero_num": -1})
        check(st == 422, "parqueadero_num=-1 -> 422", f"status={st}")

        # --- criterio de busqueda completo (compra) -----------------------
        st, data = get(
            base,
            "/api/properties",
            {
                "tipo_negocio": "compra",
                "precio_min": 60_000_000,
                "precio_max": 80_000_000,
                "area_min": 65,
                "area_max": 90,
                "balcon_min": 1,
                "balcon_max": 2,
                "estrato_min": 3,
                "estrato_max": 4,
                "parqueadero_min": 1,
                "parqueadero_max": 2,
            },
        )
        check(st == 200 and ids(data) == [1, 2],
              "criterio compra completo (60M-80M, 65-90m2, 1-2 balcon, "
              "estrato 3-4, 1-2 parqueadero)",
              f"ids={ids(data)}")

        # --- criterio de busqueda completo (arriendo, canon 2M-3M) --------
        st, data = get(
            base,
            "/api/properties",
            {
                "tipo_negocio": "arriendo",
                "precio_min": 2_000_000,
                "precio_max": 3_000_000,
                "area_min": 65,
                "area_max": 90,
                "balcon_min": 1,
                "balcon_max": 2,
                "estrato_min": 3,
                "estrato_max": 4,
                "parqueadero_min": 1,
                "parqueadero_max": 2,
            },
        )
        check(st == 200 and ids(data) == [3],
              "criterio arriendo completo (canon 2M-3M, 65-90m2, 1-2 balcon, "
              "estrato 3-4, 1-2 parqueadero)",
              f"ids={ids(data)}")

        st, data = get(
            base,
            "/api/properties",
            {"tipo_negocio": "arriendo", "precio_min": 2_000_000, "precio_max": 3_000_000},
        )
        check(st == 200 and ids(data) == [3, 4],
              "canon arriendo 2M-3M (5=1.4M queda fuera)", f"ids={ids(data)}")

        st, data = get(
            base,
            "/api/properties",
            {"tipo_negocio": "arriendo", "precio_min": 2_500_000, "precio_max": 3_000_000},
        )
        check(st == 200 and ids(data) == [3],
              "canon 2.5M-3M: limite inferior inclusivo (3=2.5M entra)",
              f"ids={ids(data)}")

        # --- orden --------------------------------------------------------
        st, data = get(base, "/api/properties", {"ordenar": "area"})
        areas = [i["area_m2"] for i in data["items"] if i["area_m2"] is not None]
        check(st == 200 and areas == sorted(areas), "ordenar=area ascendente", f"areas={areas}")

        st, _ = get(base, "/api/properties", {"ordenar": "peso"})
        check(st == 422, "ordenar invalido -> 422", f"status={st}")

        # --- regresion: filtros previos siguen funcionando -----------------
        st, data = get(base, "/api/properties", {"q": "Arriendo"})
        check(st == 200 and ids(data) == [3, 4, 5], "filtro q (regresion)", f"ids={ids(data)}")

        st, data = get(base, "/api/properties", {"status": "pendiente", "limite": 2})
        check(st == 200 and len(data["items"]) == 2 and data["total"] == 6,
              "status + limite (regresion)", f"total={data['total']}")

        st, data = get(base, "/api/properties/1")
        check(st == 200 and data["tipo_negocio"] == "compra" and data["balcon"] == 2
              and data["parqueadero_num"] == 2,
              "GET /api/properties/1 expone campos nuevos (incl. parqueadero_num)")

        st, data = get(base, "/api/properties/5")
        check(st == 200 and data["parqueadero_num"] is None
              and data["parqueadero"] == "2 parqueaderos",
              "GET /api/properties/5 mantiene `parqueadero` (TEXT) intacto")

        # --- la DB real no fue tocada -------------------------------------
        conn = sqlite3.connect(DB_PATH)
        try:
            total_real = conn.execute("SELECT COUNT(*) FROM casa_opciones").fetchone()[0]
        finally:
            conn.close()
        check(total_real == 0, "DB real intacta (0 filas)", f"filas={total_real}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        for suffix in ("", "-wal", "-shm"):
            p = Path(str(db_test) + suffix)
            if p.exists():
                p.unlink()

    fallos = [r for r in results if not r[0]]
    print(f"\n== {len(results) - len(fallos)}/{len(results)} checks OK ==")
    if fallos:
        for _, nombre, detalle in fallos:
            print(f"  FAIL: {nombre} {detalle}")
        return 1
    print("Todos los filtros responden como se espera.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
