FROM python:3.12-slim
WORKDIR /code
COPY backend/requirements-ml.txt .
RUN pip install --no-cache-dir -r requirements-ml.txt
COPY backend/app /code/app
COPY services/ml_execution /code/services/ml_execution
RUN useradd --create-home appuser && chown -R appuser:appuser /code
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"
CMD ["sh", "-c", "uvicorn services.ml_execution.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
