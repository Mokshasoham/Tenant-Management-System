# API Reference — Verification & Trust Platform

Mounted at `/api/verifications`, `/api/verification`, and `/api/v1/verifications`.

All endpoints require a valid JWT token sent in the `Authorization: Bearer <token>` header.

---

## 1. Static Metadata Endpoints

### `GET /api/verifications/templates`
Retrieves all configured verification document templates.
- **Access**: All authenticated users (`authenticate`).
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "code": "GOVT_ID",
      "name": "Government Photo ID",
      "allowedFormats": ["pdf", "png", "jpg"],
      "maxSizeBytes": 10
    }
  ]
}
```

### `GET /api/verifications/workflows`
Retrieves all active entity verification workflows.
- **Access**: All authenticated users (`authenticate`).

---

## 2. Verification Lifecycle Endpoints

### `POST /api/verifications`
Initiates a new verification draft for an entity.
- **Access**: `authenticate` (Users can initiate for themselves; Admins/Managers can initiate for any entity).
- **Request Body**:
```json
{
  "entityType": "TENANT",
  "entityId": "6a75a3ea1631f335aeb4f078"
}
```
- **Response**: `201 Created`

### `PUT /api/verifications/:id`
Updates draft verification step data.
- **Access**: `authenticate` + Ownership Guard.

### `POST /api/verifications/:id/documents`
Attaches an uploaded document to a draft verification.
- **Request Body**:
```json
{
  "documentType": "GOVT_ID",
  "fileId": "file_178590123",
  "filename": "passport.pdf",
  "url": "http://localhost:5000/api/files/download/file_178590123"
}
```

### `POST /api/verifications/:id/submit`
Submits a draft verification for automated check and review sequence. Generates human-readable VRF number (`VRF-YYYY-XXXXXX`).
- **Response**: `200 OK`

### `POST /api/verifications/:id/resubmit`
Resubmits a rejected verification. Sets `isLatestVersion: false` on the previous record and creates Version N+1.

---

## 3. Review & Administrative Decision Endpoints

### `GET /api/verifications` (Admin Queue)
Lists pending verifications with filtering and pagination.
- **Access**: `authorize('admin')`.
- **Query Params**: `status`, `entityType`, `isOverdue`, `slaStatus`, `search`, `page`, `limit`.

### `POST /api/verifications/:id/review`
Submits Level 2 Manager Review.
- **Access**: `authorize('manager', 'admin')`.
- **Request Body**: `{ "decision": "APPROVE", "remarks": "Manager pre-checked." }`

### `POST /api/verifications/:id/approve`
Submits Level 3 Admin Final Approval. Calculates trust score and awards badges.
- **Access**: `authorize('admin')`.

### `POST /api/verifications/:id/reject`
Submits Level 3 Admin Final Rejection.
- **Access**: `authorize('admin')`.
- **Request Body**: `{ "remarks": "Document illegible." }` (Required).

---

## 4. History & Widget Endpoints

### `GET /api/verifications/history/:entityType/:entityId`
Returns complete version history array for an entity.

### `GET /api/verifications/widget/:profile/:entityId?`
Returns pre-composed summary widget data for dashboard widgets (`TENANT`, `MANAGER`, `TECHNICIAN`, `ADMIN`).
