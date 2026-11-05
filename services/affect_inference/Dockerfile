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
CMD ["sh", "-c", "uvicorn services.affect_inference.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
