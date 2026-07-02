FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["uvicorn", "main:server", "--host", "0.0.0.0", "--port", "8000"]
