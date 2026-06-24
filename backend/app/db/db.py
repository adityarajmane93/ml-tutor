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
    pool_size=20,          # Keep 20 connections open permanently
    max_overflow=10,       # Allow up to 10 extra temporary connections during traffic spikes
    pool_timeout=30,       # Wait up to 30 seconds for a connection to free up before throwing an error
    pool_recycle=1800      # Recycle connections every 30 minutes to prevent stale drops
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()