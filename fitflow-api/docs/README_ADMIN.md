Admin account creation (one-time)
================================

This project includes a one-off script to create a single admin user in the MongoDB database. The script will not create another admin if one already exists.

Usage (run from project root):

```bash
cd fitflow-api
ADMIN_EMAIL=admin@fitflow.com ADMIN_PASSWORD='ChangeMe123!' ADMIN_NAME='Administrator' node scripts/create_admin.js
```

Notes:
- The script reads `MONGODB_URI` from your environment (or .env). Ensure the backend env is configured first.
- After creating the admin, sign in using the regular login endpoint (`/api/auth/login`) with the admin credentials.
- Regular registration still creates users with role `user`.
