export function getPromptForDocumentType(fileName: string): { documentType: string; prompt: string } {
  const lowerFileName = fileName.toLowerCase();
  let documentType = "Unknown";
  let prompt = "";

  if (lowerFileName.includes("passport")) {
    documentType = "Passport";
    prompt = `You are an expert OCR system specializing in passport document extraction. Analyze this passport image carefully.

CRITICAL INSTRUCTIONS:
- Look for the Machine Readable Zone (MRZ) at the bottom - it's the most reliable source
- Cross-reference printed text with MRZ data for accuracy
- Pay attention to document layout - name is usually at top, dates and numbers follow standard patterns

EXTRACT THE FOLLOWING:
1. Full name: Extract surname and given names exactly as printed (not from MRZ format)
2. Passport number: Usually alphanumeric, 6-9 characters, found in top right or near photo
3. Date of birth: Format EXACTLY as DD-MMM-YYYY (e.g., 15-Mar-1990) - use 3-letter month abbreviations
4. Nationality: The country that issued the passport (look for "Nationality" field or country code)
5. Issue date: Format EXACTLY as DD-MMM-YYYY (e.g., 10-Jan-2020) - the date the passport was issued
6. Expiry date: Format EXACTLY as DD-MMM-YYYY (e.g., 20-Dec-2030) - use 3-letter month abbreviations

HANDLING UNCLEAR DATA:
- If text is blurry or unclear, use your best interpretation
- If a field is completely unreadable, use empty string ""
- Double-check dates are valid (day 01-31, valid month name, year 4 digits)
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens (e.g., 15-Mar-1990, 20-Dec-2030)

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, passportIssueDate, expiryDate. No additional text, explanations, or markdown.`;
  } else if (lowerFileName.includes("visa")) {
    documentType = "Visa";
    prompt = `You are an expert OCR system specializing in visa document extraction. Analyze this visa document carefully.

CRITICAL INSTRUCTIONS:
- Visas have various formats - look for official stamps, stickers, or printed documents
- Key information is usually in the main body of the visa sticker/stamp
- Some information may reference an attached passport

EXTRACT THE FOLLOWING:
1. Full name: Extract exactly as printed on the visa
2. Passport number: May be printed on visa itself or may need to check attached passport (if visible)
3. Date of birth: Format EXACTLY as DD-MMM-YYYY (e.g., 15-Mar-1990) - use 3-letter month abbreviations
4. Nationality: Country of the passport holder
5. Visa expiry date: Format EXACTLY as DD-MMM-YYYY (e.g., 20-Dec-2030) - use 3-letter month abbreviations
6. Visa type: Category or type (e.g., "Tourist", "B1/B2", "Work", "Student", "Transit")

HANDLING UNCLEAR DATA:
- If passport number is not on visa itself, use empty string ""
- For visa type, look for codes like "B1", "B2", "H1B", or words like "Tourist", "Business"
- If text is unclear, make your best interpretation
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens (e.g., 15-Mar-1990, 20-Dec-2030)

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType. No additional text, explanations, or markdown.`;
  } else if (lowerFileName.includes("flight") || lowerFileName.includes("ticket")) {
    documentType = "Flight Ticket";
    prompt = `You are an expert OCR system specializing in flight ticket and boarding pass extraction. Analyze this document carefully.

CRITICAL INSTRUCTIONS:
- Flight tickets have passenger name, flight details, and travel dates
- Look for airline logos and flight number patterns (e.g., AA123, BA456)
- Departure and arrival information is usually prominent
- Look for booking/confirmation codes, seat assignments, and meal preferences

EXTRACT THE FOLLOWING:
1. Passenger name: Full name as printed on ticket (usually in format: LASTNAME/FIRSTNAME)
2. Flight number: Airline code + number (e.g., "AA 1234", "BA 456", "DL 789")
3. Booking reference: Also called PNR, confirmation code, or record locator (usually 6 alphanumeric characters, e.g., "ABC123")
4. Ticket number: The e-ticket number (usually 13 digits, may start with airline code like "016-1234567890")
5. Departure: City name or airport code of origin (e.g., "New York JFK", "London Heathrow", "LAX")
6. Arrival: City name or airport code of final destination (e.g., "Paris CDG", "Tokyo Narita", "SFO")
7. Transit stop: If flight has a layover/connection, extract the transit city and airport (e.g., "Dubai DXB", "Frankfurt FRA"). Leave empty if direct flight
8. Seat number: The assigned seat (e.g., "12A", "24C", "3F")
9. Inflight meal: Meal preference if shown (e.g., "Vegetarian", "Halal", "Hindu", "Kosher", "Regular", "VGML", "HNML")
10. Departure date: Format EXACTLY as DD-MMM-YYYY (e.g., 25-Dec-2024) - use 3-letter month abbreviations

HANDLING UNCLEAR DATA:
- If passenger name has "/" separator, keep it as is
- Include both city name and airport code if both are visible
- For date, look for departure date specifically (not booking date or arrival date)
- If text is unclear, make your best interpretation
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens (e.g., 25-Dec-2024)
- If a field is not visible or not applicable, use empty string ""

Return ONLY a JSON object with these exact keys: name, flightNumber, bookingReference, ticketNumber, departure, arrival, transitStop, seatNumber, inflightMeal, dateOfBirth (use departure date here). No additional text, explanations, or markdown.`;
  } else {
    prompt = `You are an expert OCR system. Analyze this document and identify what type it is.

STEPS:
1. Determine if this is a PASSPORT, VISA, or FLIGHT TICKET
2. Extract all relevant information based on document type
3. Use the appropriate field names for the identified document type

PASSPORT fields: name, passportNumber, dateOfBirth, nationality, passportIssueDate, expiryDate
VISA fields: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType
FLIGHT TICKET fields: name, flightNumber, bookingReference, ticketNumber, departure, arrival, transitStop, seatNumber, inflightMeal, dateOfBirth (use departure date)

FORMATTING:
- All dates MUST be in DD-MMM-YYYY format with hyphens (e.g., 15-Mar-1990, 20-Dec-2030)
- If a field is not found or unclear, use empty string ""
- Be as accurate as possible with OCR

Return ONLY a JSON object with available data. No additional text, explanations, or markdown.`;
  }

  return { documentType, prompt };
}
