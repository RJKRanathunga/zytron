from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, func, select, text

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from app.config import build_postgresql_uri  # noqa: E402


EXCLUDED_TABLES = {"alembic_version"}


def sqlite_url(sqlite_path: Path) -> str:
    return f"sqlite:///{sqlite_path.resolve().as_posix()}"


def table_count(connection, table) -> int:
    return connection.execute(select(func.count()).select_from(table)).scalar_one()


def chunks(rows, size: int):
    for index in range(0, len(rows), size):
        yield rows[index : index + size]


def parse_args():
    parser = argparse.ArgumentParser(description="Copy PolyLoop data from SQLite into the configured PostgreSQL database.")
    parser.add_argument(
        "--sqlite-path",
        type=Path,
        default=SERVER_DIR / "instance" / "polyloop.sqlite",
        help="Path to the existing SQLite database. Defaults to instance/polyloop.sqlite.",
    )
    parser.add_argument(
        "--postgres-url",
        default=build_postgresql_uri(),
        help="PostgreSQL SQLAlchemy URL. Defaults to PG_* environment variables.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows to insert per batch.",
    )
    parser.add_argument(
        "--truncate-postgres",
        action="store_true",
        help="Truncate PostgreSQL tables before copying. The SQLite database is never modified.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print source and destination counts without copying.",
    )
    parser.add_argument(
        "--connect-timeout",
        type=int,
        default=10,
        help="PostgreSQL connection timeout in seconds.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.sqlite_path.exists():
        raise SystemExit(f"SQLite database not found: {args.sqlite_path}")

    source_engine = create_engine(sqlite_url(args.sqlite_path))
    target_connect_args = {"connect_timeout": args.connect_timeout} if args.postgres_url.startswith("postgresql") else {}
    target_engine = create_engine(args.postgres_url, connect_args=target_connect_args)

    source_metadata = MetaData()
    target_metadata = MetaData()
    source_metadata.reflect(bind=source_engine)
    target_metadata.reflect(bind=target_engine)

    source_tables = set(source_metadata.tables) - EXCLUDED_TABLES
    target_tables = set(target_metadata.tables) - EXCLUDED_TABLES
    missing_in_postgres = sorted(source_tables - target_tables)
    if missing_in_postgres:
        raise SystemExit(f"Run PostgreSQL migrations first. Missing table(s): {', '.join(missing_in_postgres)}")

    ordered_tables = [table.name for table in target_metadata.sorted_tables if table.name in source_tables]

    with source_engine.connect() as source, target_engine.begin() as target:
        source_counts = {name: table_count(source, source_metadata.tables[name]) for name in ordered_tables}
        target_counts = {name: table_count(target, target_metadata.tables[name]) for name in ordered_tables}

        print("Table row counts:")
        for name in ordered_tables:
            print(f"  {name}: sqlite={source_counts[name]} postgres={target_counts[name]}")

        non_empty_targets = [name for name, count in target_counts.items() if count]
        if args.dry_run:
            return 0

        if non_empty_targets and not args.truncate_postgres:
            raise SystemExit(
                "PostgreSQL already has data in table(s): "
                f"{', '.join(non_empty_targets)}. Re-run with --truncate-postgres for a fresh copy."
            )

        if args.truncate_postgres:
            preparer = target_engine.dialect.identifier_preparer
            table_names = ", ".join(preparer.format_table(target_metadata.tables[name]) for name in reversed(ordered_tables))
            target.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))

        for name in ordered_tables:
            source_table = source_metadata.tables[name]
            target_table = target_metadata.tables[name]
            rows = [dict(row) for row in source.execute(select(source_table)).mappings()]
            if not rows:
                print(f"Skipped {name}: no rows")
                continue

            for batch in chunks(rows, args.batch_size):
                target.execute(target_table.insert(), batch)
            print(f"Copied {len(rows)} row(s) into {name}")

    with source_engine.connect() as source, target_engine.connect() as target:
        for name in ordered_tables:
            source_total = table_count(source, source_metadata.tables[name])
            target_total = table_count(target, target_metadata.tables[name])
            if source_total != target_total:
                raise SystemExit(f"Count mismatch for {name}: sqlite={source_total} postgres={target_total}")

    print("SQLite to PostgreSQL data migration completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
