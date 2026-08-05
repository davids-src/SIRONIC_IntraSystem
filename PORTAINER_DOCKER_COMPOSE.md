# SIRONIC IntraSystem – Portainer Docker Compose Configuration

A Portainer Stack menüjébe másolható teljes `docker-compose.yml` konfiguráció MongoDB adatbázissal, CRM alkalmazással és Partner Portállal.

```yaml
version: "3.8"

services:
  # ── MongoDB Adatbázis ──
  mongodb:
    image: mongo:7.0
    container_name: sironic-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: sironic_crm
    volumes:
      - mongo-data:/data/db
    networks:
      - sironic-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── CRM Alkalmazás (Port 3000) ──
  crm-app:
    build:
      context: .
      dockerfile: apps/crm/Dockerfile
    container_name: sironic-crm
    restart: always
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/sironic_crm
      - AUTH_SECRET=sironic-crm-production-auth-secret-key-min-32-chars-long
      - AUTH_URL=http://localhost:3000
      - NEXTAUTH_URL=http://localhost:3000
      - NODE_ENV=production
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - sironic-network

  # ── Partner Portál (Port 3001) ──
  partner-portal:
    build:
      context: .
      dockerfile: apps/partner-portal/Dockerfile
    container_name: sironic-partner-portal
    restart: always
    ports:
      - "3001:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/sironic_crm
      - AUTH_SECRET=sironic-crm-production-auth-secret-key-min-32-chars-long
      - AUTH_URL=http://localhost:3001
      - NEXTAUTH_URL=http://localhost:3001
      - NODE_ENV=production
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - sironic-network

volumes:
  mongo-data:
    driver: local

networks:
  sironic-network:
    driver: bridge
```

## Használati Útmutató (Portainer)

1. Nyisd meg a Portainert.
2. Menj a **Stacks** -> **Add stack** menüpontba.
3. Nevezd el a Stacket (pl. `sironic-system`).
4. Másold be a fenti YAML kódot a **Web editor** mezőbe.
5. Szükség esetén frissítsd az `AUTH_SECRET` és domain / URL értékeket a saját éles szervered címeire.
6. Kattints a **Deploy the stack** gombra.
