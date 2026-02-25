

# Scaling DocuScan AI for 50+ Concurrent Users

## The Problem

Currently, each user's 10 documents are processed **one at a time sequentially** via the edge function, which calls the Lovable AI Gateway. With 50 users uploading 10 documents each, that's **500 near-simultaneous API calls** to the AI gateway, which will trigger **rate limits (429 errors)** and potentially **payment limits (402 errors)**.

## Key Bottlenecks

1. **No rate limit handling** -- the edge function doesn't catch 429/402 errors from the AI gateway
2. **No client-side queuing** -- all documents fire requests as fast as possible
3. **No retry logic** -- if a request fails, it just throws an error and stops
4. **No progress feedback** -- users don't know which document is being processed

## Implementation Plan

### 1. Edge Function: Add Rate Limit Error Handling

Update `supabase/functions/extract-document-data/index.ts` to:
- Catch **429** (rate limit) and **402** (payment required) responses from the AI gateway
- Return proper status codes and user-friendly error messages to the client
- Add a built-in **retry with exponential backoff** (retry up to 3 times on 429 with increasing delays)

### 2. Frontend: Request Queue with Throttling

Update `src/pages/Index.tsx` to:
- Process documents **one at a time** with a configurable delay between requests (e.g., 500ms)
- Add a **progress indicator** showing "Processing document 3 of 10..."
- On **429 errors**: pause processing, wait 5 seconds, then retry automatically
- On **402 errors**: stop processing and show a clear message about credits
- On other errors: skip the failed document, continue with remaining ones, and report failures at the end

### 3. Frontend: Progress UI

Update the processing UI to show:
- A progress bar with current document count (e.g., "Processing 3/10")
- Which document type is currently being processed
- A "Cancel" button to stop mid-processing
- A summary at the end showing successes and failures

## Technical Details

### Edge Function Changes (`supabase/functions/extract-document-data/index.ts`)

```text
Add retry logic:
- On 429 from AI gateway: retry up to 3 times
  - 1st retry: wait 2 seconds
  - 2nd retry: wait 4 seconds  
  - 3rd retry: wait 8 seconds
- On 402: return 402 immediately (no retry)
- Pass through the specific status code to the client
```

### Frontend Changes (`src/pages/Index.tsx`)

```text
Replace the sequential for loop with a queue system:
- Add state: processingProgress (current/total), processingErrors[]
- Add 500ms delay between each document request
- Handle 429: pause queue for 5s, then retry current document
- Handle 402: stop queue, show credits message
- Handle other errors: log failure, continue to next document
- Show final summary: "8/10 documents processed successfully, 2 failed"
```

### New Component: `ProcessingProgress`

A small component showing:
- Progress bar (X of Y documents)
- Current document name being processed
- Cancel button
- Error count if any failures occurred

## Expected Performance

With these changes:
- **Single user, 10 docs**: ~15-20 seconds (sequential with 500ms gaps)
- **50 concurrent users, 10 docs each**: The edge function retries handle gateway rate limits automatically; users see progress and any temporary pauses
- **Graceful degradation**: If rate limits persist, users get clear feedback instead of cryptic errors

## What This Won't Solve

- The Lovable AI Gateway has workspace-level rate limits. If 50 users truly hit the endpoint simultaneously, some will experience delays regardless
- For true production scale (hundreds of concurrent users), you would need to contact support@lovable.dev to increase rate limits
- Consider upgrading from free to paid plan for higher rate limits

