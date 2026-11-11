# Staging-only private ClamAV

This is a deployment artifact and operator runbook. It has not been deployed by this change.

## Topology

The API and ClamAV service must join the same private Docker network, `ooro-staging-private`. The compose file publishes no host port and marks the network `internal`, so ClamAV is not reachable from the public interface. The API connects to `clamav:3310` using the ClamAV TCP `INSTREAM` protocol.

Before use, pin the image to the approved digest and confirm the image tag/digest in the staging change record. Do not reuse this network or credentials for production.

## Operator steps

1. Create or select a disposable staging host and ensure its firewall has no inbound rule for TCP 3310.
2. Create the network and start only this compose project: `docker compose up -d clamav`.
3. Wait for the health check and confirm `docker inspect` shows no published ports.
4. Configure the staging API with the variables below. `DOCUMENT_SCANNER_HOST` must be `clamav`, never a public IP.
5. Restart the API and exercise the scanner acceptance tests with a synthetic PDF and EICAR only.
6. Confirm scanner outage behavior by stopping ClamAV: uploads must return `DOCUMENT_SCANNER_UNAVAILABLE` and no KYC document may be created.
7. Remove the disposable stack after acceptance with `docker compose down --volumes`; retain only non-sensitive logs and test results.

## API configuration

```env
DOCUMENT_STORAGE_MODE=s3
DOCUMENT_STORAGE_BUCKET=driver-ooro
DOCUMENT_STORAGE_REGION=auto
DOCUMENT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
DOCUMENT_STORAGE_ACCESS_KEY_ID=<staging-r2-key>
DOCUMENT_STORAGE_SECRET_ACCESS_KEY=<staging-r2-secret>
DOCUMENT_SCAN_MODE=remote
DOCUMENT_SCANNER_HOST=clamav
DOCUMENT_SCANNER_PORT=3310
DOCUMENT_SCANNER_TIMEOUT_MS=10000
DOCUMENT_SCANNER_RETRIES=1
```

Provision a least-privilege R2 key scoped to `driver-ooro` before staging use. Never put secrets in this repository or chat.

## Acceptance evidence

- Safe synthetic document: creates a `PENDING` KYC document with `scanStatus=CLEAN`.
- EICAR: returns `DOCUMENT_INFECTED`, creates no KYC document, and removes the object.
- Timeout/connection failure: returns `DOCUMENT_SCANNER_UNAVAILABLE`, creates no KYC document, and removes the object.
- Wrong size/checksum/format: rejected before KYC review.
- Cross-driver session/document IDs: `404`/`403` and no signed URL.
- Admin verification of a non-clean document: `DOCUMENT_NOT_SCANNED`.

Do not use Aadhaar, PAN, driving licence, or any real personal document for this runbook.
