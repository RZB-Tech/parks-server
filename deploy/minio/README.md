# MinIO AIStor deployment

This deployment runs a single-node MinIO AIStor server for the Parks backend.
It attaches to the existing external Docker network named `parks-net`.

## Host paths

- `/srv/minio/data`: persistent object data
- `/srv/minio/config/minio.license`: MinIO AIStor Free license

The S3 API and Console bind only to host loopback:

- S3 API: `127.0.0.1:9000`
- Console: `127.0.0.1:9001`

Containers on `parks-net` can reach the S3 API at `http://parks-minio:9000`.

## Secrets

Copy `minio.env.example` to `minio.env`, generate unique root credentials, and
keep the resulting file readable only by the deployment owner. The root
credentials are for initial administration only. The application must use a
separate restricted access key created after MinIO starts.

Do not commit `minio.env` or `minio.license`.

## Application policy

`parks-server-policy.json` grants the backend access only to the
`wonder-walk-s3` bucket. Do not configure the application with MinIO root
credentials.
