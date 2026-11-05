import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Load variables from the .env file
load_dotenv()

# 2. Fetch the URL securely. SUPABASE_DB_URL is retained only as a
# backwards-compatible local-development alias; deployments must use
# DATABASE_URL.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("No DATABASE_URL found in environment variables!")

# 3. Create the engine. The former 20+10 connection pool was unnecessarily
# large for a single Railway service and could exhaust managed DB limits.
logger = logging.getLogger(__name__)


def _positive_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
        return value if value > 0 else default
    except ValueError:
        logger.warning("Invalid %s value; using default %s", name, default)
        return default


engine_options = {"pool_pre_ping": True}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update(
        {
            "pool_size": _positive_int_env("DB_POOL_SIZE", 5),
            "max_overflow": _positive_int_env("DB_MAX_OVERFLOW", 5),
            "pool_timeout": _positive_int_env("DB_POOL_TIMEOUT_SECONDS", 30),
            "pool_recycle": _positive_int_env("DB_POOL_RECYCLE_SECONDS", 1800),
        }
    )

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
