

# Add Visa Expiry Date Column

## Problem
When a visa document is processed, the AI returns the visa expiry date in the `expiryDate` field, which gets displayed under "Passport Expiry Date". These are different dates and need separate columns.

## Changes

### 1. Edge Function — Separate visa expiry from passport expiry
**File:** `supabase/functions/extract-document-data/index.ts`
- Update the visa prompt to return `visaExpiryDate` instead of `expiryDate`
- Update the generic prompt to include `visaExpiryDate` for visa fields
- Add `visaExpiryDate` to the `completeData` response object
- For visa documents: map `expiryDate` from AI → `visaExpiryDate`, and clear `expiryDate` so it doesn't populate the passport column

### 2. Frontend Data Type — Add new field
**File:** `src/components/ExtractedDataTable.tsx`
- Add `visaExpiryDate?: string` to the `ExtractedData` interface
- Add a new "Visa Expiry Date" column header after "Visa Type"
- Add the corresponding table cell rendering

### 3. Frontend Logic — Update consolidation and export
**File:** `src/pages/Index.tsx`
- Add `visaExpiryDate` to the merge logic in `consolidateData`
- Add "Visa Expiry Date" header and `row.visaExpiryDate` to the CSV export

