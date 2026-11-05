# Database migrations

Phase 1 uses Alembic. Run migrations from `backend/` with `DATABASE_URL` set:

```bash
alembic upgrade head
```

For an existing database created by the previous `Base.metadata.create_all` startup behaviour, do **not** run the baseline creation migration against it. First record the existing schema without changing rows, then apply the additive Phase 1 migration:

```bash
alembic stamp 20261105_01
alembic upgrade head
```

`20261105_02_study_sessions` adds nullable context fields and new tables only. It does not delete or rewrite existing research data.
