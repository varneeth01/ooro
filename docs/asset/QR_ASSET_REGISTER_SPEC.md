# OORO QR-linked asset register — implementation specification

Status: design proposed; **not yet implemented or deployed**.
Target repo: varneeth01/ooro (Next.js App Router + Fastify API + Prisma PostgreSQL).
First asset: `ANOK-OORO-DIS-0001`.
Canonical permanent sticker URL: `https://theooro.com/asset/ANOK-OORO-DIS-0001`.

## User journeys
1. Anyone scans QR -> public read-only webpage with OORO brand, asset ID, display type, public status (registered/unverified/retired), and support contact. Never leak owner contact, driver/vehicle identifiers, exact GPS, acquisition cost, invoices, serial number, employee details, or documents.
2. Authenticated SUPER_ADMIN scans same URL -> separate button to enter `/admin/assets/ANOK-OORO-DIS-0001` (after server-side role authorization) where asset can be edited, documents uploaded, viewed, replaced/versioned, and downloaded through signed short-expiry links.
3. Main admin `/admin/assets` -> search/filter/status and asset overview; SUPER_ADMIN can manage financial/ownership fields and documents. Other admins only get fields explicitly permitted by RBAC.
4. Asset QR permanently resolves by assetId; asset location, financial status, custodian, and documents remain editable without reprinting the tag.

## Database
Add separate Prisma models, migration and indexes:
- `CompanyAsset`: uuid pk, assetCode unique, title, kind, brand, model, serialNumber nullable, status enum DRAFT / DOCUMENTS_PENDING / ACTIVE / IN_REPAIR / RETIRED / DISPOSED; acquisitionDate nullable, acquisitionCostPaise nullable, costEvidenceStatus enum MISSING / SELF_DECLARED / DOCUMENTED / VERIFIED, ownershipStatus enum UNVERIFIED / TRANSFER_PENDING / COMPANY_OWNED / THIRD_PARTY, legalEntityName, deviceId nullable relation if appropriate, vehicleId nullable relation if appropriate, createdAt updatedAt createdById.
- `AssetDocument`: uuid, assetId, type enum PURCHASE_INVOICE / OWNERSHIP_DECLARATION / SALE_TRANSFER_DEED / BOARD_APPROVAL / PAYMENT_PROOF / HANDOVER / WARRANTY / SERVICE / OTHER, privateObjectKey, originalFileName, mimeType, byteSize, sha256, revision, uploadedById, uploadedAt, deletedAt, verifiedById nullable, verifiedAt nullable. **Never expose privateObjectKey in public JSON.**
- `AssetEvent`: uuid, assetId, actorId nullable, eventType, metadataJson (redacted), createdAt. Record create, change, assign, upload, verify, download, retire.
Create seed or controlled one-time admin creation for ANOK-OORO-DIS-0001 with `ownershipStatus=UNVERIFIED`, `costEvidenceStatus=MISSING` (there is no purchase invoice), and do not assert ownership has been legally proven.

## API
- `GET /api/public/assets/:assetCode`: strict DTO allowlist and 404 for unknown assets; rate-limited; no protected attributes.
- `GET /api/admin/assets`, `POST /api/admin/assets`, `GET/PATCH /api/admin/assets/:assetCode`: existing authenticated session, RBAC and CSRF protections; update only whitelisted fields, use Zod validation.
- `POST /api/admin/assets/:assetCode/documents/upload-intent`: SUPER_ADMIN role required, generate random object key and short-expiry signed PUT URL for private S3/R2, enforce allowed PDF/JPEG/PNG types and size cap; finalize upload with verified object HEAD, MIME/content checks, sha256 and object permissions.
- `GET /api/admin/assets/:assetCode/documents` and `GET /api/admin/assets/:assetCode/documents/:id/download`: SUPER_ADMIN role and short-expiry signed GET only; never public links.
- Maintain audit events and conflict/version checks. Reuse app's existing admin auth and object-storage abstractions; avoid making a parallel session mechanism.
- Super admin must be an explicit least-privilege server-side permission; do not simply infer SUPER_ADMIN from a client-side label.

## Frontend
- `app/asset/[assetCode]/page.tsx`: public SSR metadata noindex, responsive, clear 'Ownership documentation pending' when applicable; no sensitive data.
- `app/admin/assets/page.tsx`: search, create asset, printable QR using existing qrcode dependency, records list.
- `app/admin/assets/[assetCode]/page.tsx`: multi-tab overview / documents / installation / activity; conditional SUPER_ADMIN controls; PDF/image preview via authorized URL; status chips distinguishing pending from verified.
- Show QR in existing screen admin detail and link related `deviceId`, but do not change Screen Player pairing or DeviceOS APIs.

## No invoice flow
Use signed declaration from current possessor + dated handover, make/model, photos, component list, serials, evidence of payments if available, sale/transfer agreement (if individual -> ANOK), and relevant company approvals. Keep status pending until a responsible reviewer/CA confirms accounting/ownership treatment. A QR sticker does not establish title or GST ITC.

## Acceptance tests
- Public scan returns limited asset info and 200 once deployed.
- All unauthenticated/private document fetches denied.
- Admin vs SUPER_ADMIN roles enforced on server.
- Unknown and invalid IDs give 404, no leaked records.
- Upload/download follows private storage and signed links.
- Editing asset info preserves stable QR.
- Audit trail captures privileged actions.
- Migration applies to test DB; API tests, Next.js build, auth regression, mobile checks all pass before rollout.

## Rollout
Implement feature behind flag, migrate staging DB, create first asset, upload evidence, confirm scan URL on staging and mobile, deploy backend + frontend, verify public DNS and HTTPS, then print final sticker. Existing QR encoding plain data is not interchangeable with web QR; replace after URL works.
