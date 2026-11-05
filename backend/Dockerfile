FROM python:3.12-slim
WORKDIR /code
COPY backend/requirements-core.txt .
RUN pip install --no-cache-dir -r requirements-core.txt
COPY backend .
RUN useradd --create-home appuser && chown -R appuser:appuser /code
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD-SHELL python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8080') + '/health', timeout=3)"
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
