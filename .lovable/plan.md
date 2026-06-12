# Run DocuScan AI Locally with Gemini 2.5 Flash (Direct API)

## Goal
Run the cloned repo on your machine, pointed at your own Supabase project, with the edge function calling **Google Gemini 2.5 Flash directly** (via Google AI Studio) instead of the Lovable AI Gateway.

## Prerequisites
- Node.js 18+ (or Bun)
- Supabase CLI (`npm i -g supabase`)
- A Google AI Studio API key — get one free at https://aistudio.google.com/apikey
- Your own Supabase project (free tier is fine)

---

## Steps

### 1. Install dependencies
In the cloned repo root:
```
npm install
```

### 2. Point the frontend at your Supabase project
Edit `.env`:
```
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
```
Find these in Supabase Dashboard → Project Settings → API.

### 3. Stub the generated types file
`src/integrations/supabase/types.ts` is tied to the original project. Easiest fix — replace its contents with:
```ts
export type Database = any;
```
(You can later regenerate proper types with `supabase gen types typescript`.)

### 4. Update the edge function to call Gemini directly
Replace the body of `supabase/functions/extract-document-data/index.ts` so it calls Google's Generative Language API instead of the Lovable AI Gateway.

The change is localized to the `callAIGateway` function and the env-var name. The new fetch call:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}
```
With request body shape:
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      { "text": "<prompt>" },
      { "inline_data": { "mime_type": "image/jpeg", "data": "<base64>" } }
    ]
  }],
  "generationConfig": { "responseMimeType": "application/json" }
}
```
Parse `data.candidates[0].content.parts[0].text` (already JSON because of `responseMimeType`).

Keep the existing retry logic for 429s. Rename `LOVABLE_API_KEY` references to `GEMINI_API_KEY`.

### 5. Link and deploy the edge function
```
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<your-google-ai-studio-key>
supabase functions deploy extract-document-data --no-verify-jwt
```

### 6. Run the app
```
npm run dev
```
Open http://localhost:8080, upload a passport/visa/ticket image, and confirm extraction works.

---

## Technical notes
- Gemini 2.5 Flash on the free Google AI Studio tier has rate limits (currently ~10 RPM, 250 RPD). The existing exponential-backoff retry will help, but bulk uploads of 20+ docs may pause.
- The Lovable AI Gateway accepts OpenAI-style `messages`/`image_url`; Google's native API uses `contents`/`parts`/`inline_data`. That's why step 4's body shape is different.
- `responseMimeType: "application/json"` makes Gemini return raw JSON — no need to strip ```json fences anymore, but keep the strip code as a safety net.
- CORS headers, retry loop, error codes (402/429), and consolidation logic on the frontend all stay unchanged.

---

## Confirm before I proceed
Do you want me to write out the **exact replacement code** for `supabase/functions/extract-document-data/index.ts` (Gemini direct version) so you can paste it into your local repo? Approve this plan and I'll generate it.
