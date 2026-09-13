"""Migraciones de esquema para Casa Search.

Idempotente: se puede ejecutar tantas veces como se quiera.
Uso:
    python migrate.py                # usa CASA_DB_PATH o la DB por defecto
    python migrate.py --db /ruta.db  # DB explícita
    python migrate.py --check        # solo reporta, no modifica
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from typing import Any

from db import DB_PATH

# ---------------------------------------------------------------------------
# Columnas requeridas por los filtros de búsqueda.
# nombre -> (definición SQL) ; si la columna ya existe se omite.
# ---------------------------------------------------------------------------
REQUIRED_COLUMNS: dict[str, str] = {
    # Tipo de negocio: compra (venta) o arriendo.
    "tipo_negocio": (
        "TEXT CHECK (tipo_negocio IS NULL "
        "OR tipo_negocio IN ('compra', 'arriendo'))"
    ),
    # Balcones: cantidad (0..2 segun criterio de busqueda actual).
    "balcon": "INTEGER CHECK (balcon IS NULL OR balcon >= 0)",
    # Estrato socioeconomico (1..6).
    "estrato": (
        "INTEGER CHECK (estrato IS NULL OR estrato BETWEEN 1 AND 6)"
    ),
    # Rango de area publicado por el anuncio (puede diferir de area_m2).
    "area_min": "REAL CHECK (area_min IS NULL OR area_min > 0)",
    "area_max": "REAL CHECK (area_max IS NULL OR area_max > 0)",
    # Parqueaderos: cantidad numerica y filtrable (1, 2, ...).
    # `parqueadero` (TEXT, texto libre del anuncio) se conserva tal cual.
    "parqueadero_num": (
        "INTEGER CHECK (parqueadero_num IS NULL OR parqueadero_num >= 0)"
    ),
}

REQUIRED_INDEXES: dict[str, str] = {
    "idx_tipo_negocio": "casa_opciones(tipo_negocio)",
    "idx_estrato": "casa_opciones(estrato)",
    "idx_balcon": "casa_opciones(balcon)",
    "idx_area_m2": "casa_opciones(area_m2)",
    "idx_parqueadero_num": "casa_opciones(parqueadero_num)",
}


def current_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def current_indexes(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index'"
    ).fetchall()
    return {row[0] for row in rows}


def migrate(db_path: str, check_only: bool = False) -> dict[str, Any]:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys=ON")

        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        if "casa_opciones" not in tables:
            raise SystemExit(
                f"ERROR: la tabla casa_opciones no existe en {db_path}"
            )

        existing = current_columns(conn, "casa_opciones")
        pending = [c for c in REQUIRED_COLUMNS if c not in existing]

        added: list[str] = []
        for column in pending:
            sql = f"ALTER TABLE casa_opciones ADD COLUMN {column} {REQUIRED_COLUMNS[column]}"
            print(("  [check] " if check_only else "  [add]  ") + sql)
            if not check_only:
                conn.execute(sql)
                added.append(column)

        existing_idx = current_indexes(conn)
        added_idx: list[str] = []
        for name, target in REQUIRED_INDEXES.items():
            if name in existing_idx:
                continue
            sql = f"CREATE INDEX IF NOT EXISTS {name} ON {target}"
            print(("  [check] " if check_only else "  [idx]  ") + sql)
            if not check_only:
                conn.execute(sql)
                added_idx.append(name)

        if not check_only:
            conn.commit()

        print(
            f"\nDB: {db_path}\n"
            f"  columnas agregadas : {added or 'ninguna (ya al dia)'}\n"
            f"  indices agregados  : {added_idx or 'ninguno (ya al dia)'}\n"
            f"  filas en tabla     : "
            f"{conn.execute('SELECT COUNT(*) FROM casa_opciones').fetchone()[0]}"
        )
        return {"path": db_path, "columns": added, "indexes": added_idx}
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Migraciones Casa Search")
    parser.add_argument("--db", default=DB_PATH, help="Ruta de la DB SQLite")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Solo reporta diferencias, no modifica la DB",
    )
    args = parser.parse_args()

    print(f"Migrando esquema en {args.db}\n")
    try:
        migrate(args.db, check_only=args.check)
    except sqlite3.Error as exc:  # pragma: no cover
        print(f"ERROR de SQLite: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
