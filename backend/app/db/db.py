import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Load variables from the .env file
load_dotenv()

# 2. Fetch the URL securely
SQLALCHEMY_DATABASE_URL = os.getenv("SUPABASE_DB_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("No SUPABASE_DB_URL found in environment variables!")

# 3. Create the engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True, 
    pool_recycle=3600   # Forces connections to refresh every hour
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()