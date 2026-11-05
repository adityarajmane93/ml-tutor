FROM python:3.12-slim
WORKDIR /code
COPY backend/requirements-core.txt .
RUN pip install --no-cache-dir -r requirements-core.txt
COPY backend .
RUN useradd --create-home appuser && chown -R appuser:appuser /code
USER appuser
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
