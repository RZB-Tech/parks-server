# MinIO deployment

This deployment runs a single-node MinIO (community edition) server for the
Parks backend. It attaches to the existing external Docker network named
`parks-net`.

## Host paths

- `/srv/minio/data`: persistent object data

The S3 API and Console bind only to host loopback:

- S3 API: `127.0.0.1:9000`
- Console: `127.0.0.1:9001`

Containers on `parks-net` can reach the S3 API at `http://parks-minio:9000`.

## Secrets

Copy `minio.env.example` to `minio.env`, generate unique root credentials, and
keep the resulting file readable only by the deployment owner. The root
credentials are for initial administration only. The application must use a
separate restricted access key created after MinIO starts.

Do not commit `minio.env`.

## Application policy

`parks-server-policy.json` grants the backend access only to the
`wonder-walk-s3` bucket. Do not configure the application with MinIO root
credentials.

## First-time setup (bucket + restricted access key)

Run these once, after `docker compose -f minio-compose.yml up -d` has started
successfully:

```bash
docker exec -it parks-minio mc alias set local http://localhost:9000 <MINIO_ROOT_USER> <MINIO_ROOT_PASSWORD>
docker exec -it parks-minio mc mb local/wonder-walk-s3
docker cp parks-server-policy.json parks-minio:/tmp/parks-server-policy.json
docker exec -it parks-minio mc admin policy create local parks-server-policy /tmp/parks-server-policy.json
docker exec -it parks-minio mc admin user add local <access-key> <secret-key>
docker exec -it parks-minio mc admin policy attach local parks-server-policy --user <access-key>
```

Put the resulting `<access-key>` / `<secret-key>` into `parks-server/.env` as
`S3_ACCESS_KEY` / `S3_SECRET_KEY`.
