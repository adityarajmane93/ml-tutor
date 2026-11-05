# Backend tests

Run from `backend/`:

```bash
venv/bin/python -m unittest discover -s tests -v
```

The suite uses a temporary SQLite database and validates session idempotency,
batch event acknowledgements/deduplication, database-failure handling,
concurrent ingestion, researcher-key checks, and the existing affect/rPPG
route contracts. HSEmotion inference is mocked in the route-contract test so
the suite does not download or initialize model weights.
