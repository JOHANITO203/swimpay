# 15 — Single Server Deployment

## Server baseline

V1 runs on one Ubuntu server:

- 2 GB RAM;
- 50 GB storage;
- Docker Compose.

This is acceptable for prototype, MVP and closed beta. It is not sufficient for high-availability production.

## Services

```text
caddy or nginx
postgres
valkey
nats
swimpay-api
swimpay-signal-worker
swimpay-job-worker
swimpay-web
```

## Public ports

```text
22  SSH
80  HTTP
443 HTTPS
```

## Private ports

- PostgreSQL 5432;
- Valkey 6379;
- NATS 4222.

These must not be public.

## PostgreSQL tuning for 2 GB RAM

```text
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 30
```

## Valkey tuning

```text
maxmemory = 128mb
maxmemory-policy = allkeys-lru
```

## NATS JetStream tuning

```text
max_file_store = 1GB to 2GB
max_memory_store = 64MB
```

## Docker log rotation

Recommended daemon config:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

## Security baseline

- SSH key auth only;
- disable root password login;
- UFW enabled;
- fail2ban;
- automatic security updates;
- Docker daemon not exposed;
- external backups.

## Backups

Minimum:

- daily PostgreSQL backup;
- external storage;
- 7 to 14 days retention;
- restore test before real merchants.

## Migration after V1 stable

Recommended second-server split:

```text
Server 1: proxy + web + api + workers
Server 2: PostgreSQL + Valkey + NATS + backups
```
