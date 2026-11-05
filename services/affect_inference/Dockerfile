FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /code
COPY backend/requirements-affect.txt .
RUN pip install --no-cache-dir -r requirements-affect.txt
COPY backend/app /code/app
COPY services/affect_inference /code/services/affect_inference
RUN useradd --create-home appuser && chown -R appuser:appuser /code
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD-SHELL python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8080') + '/health', timeout=3)"
CMD ["sh", "-c", "uvicorn services.affect_inference.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
