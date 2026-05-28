# sciusnu-ecosystem

Learning Ecosystem frontend + Vercel serverless proxy (`/api/submit`) for Google Apps Script.

## What this project uses
- Static HTML pages (Tailwind via CDN)
- Vercel serverless function: `api/submit.js`
- Google Apps Script Web App as the data backend

## Request actions supported by API
`/api/submit` accepts `POST` JSON with `action`:
- `login`
- `createLearnerGroup`

### 1) `login` payload
```json
{
  "action": "login",
  "username": "staff01",
  "password": "secret"
}
```

### 2) `createLearnerGroup` payload
```json
{
  "action": "createLearnerGroup",
  "groupName": "Finance Team",
  "members": 15,
  "progress": 20
}
```

## Deploy on Vercel
1. Import this repo into Vercel.
2. Add Environment Variable:
- `GAS_API_URL` = your Google Apps Script Web App URL
3. Deploy.

## Local check
Open the site and test:
- Login page: [index.html](./index.html)
- Learners page form submit: [learners.html](./learners.html)

If `GAS_API_URL` is missing, the API returns:
- HTTP `500`
- `{ "error": "GAS_API_URL is not defined in Environment Variables" }`

## Notes
- Frontend now posts to internal endpoint `"/api/submit"`.
- API validates payload by `action` before forwarding to Google Apps Script.
- Unsupported `action` returns HTTP `400`.
