const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, fileName } = await req.json();

    if (!image) {
      throw new Error("No image data provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Determine document type from filename
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
3. Date of birth: Format as YYYY-MM-DD (convert from any format like DD/MM/YYYY or DD MMM YYYY)
4. Nationality: The country that issued the passport (look for "Nationality" field or country code)
5. Expiry date: Format as YYYY-MM-DD (look for "Date of expiry" or similar)

HANDLING UNCLEAR DATA:
- If text is blurry or unclear, use your best interpretation
- If a field is completely unreadable, use empty string ""
- Double-check dates are valid (month 01-12, day 01-31)
- Ensure date formats are strictly YYYY-MM-DD

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate. No additional text, explanations, or markdown.`;
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
3. Date of birth: Format as YYYY-MM-DD (convert from any date format)
4. Nationality: Country of the passport holder
5. Visa expiry date: Format as YYYY-MM-DD (look for "valid until", "expiry", or "valid to")
6. Visa type: Category or type (e.g., "Tourist", "B1/B2", "Work", "Student", "Transit")

HANDLING UNCLEAR DATA:
- If passport number is not on visa itself, use empty string ""
- For visa type, look for codes like "B1", "B2", "H1B", or words like "Tourist", "Business"
- If text is unclear, make your best interpretation
- Ensure all dates are formatted as YYYY-MM-DD

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType. No additional text, explanations, or markdown.`;
    } else if (lowerFileName.includes("flight") || lowerFileName.includes("ticket")) {
      documentType = "Flight Ticket";
      prompt = `You are an expert OCR system specializing in flight ticket and boarding pass extraction. Analyze this document carefully.

CRITICAL INSTRUCTIONS:
- Flight tickets have passenger name, flight details, and travel dates
- Look for airline logos and flight number patterns (e.g., AA123, BA456)
- Departure and arrival information is usually prominent

EXTRACT THE FOLLOWING:
1. Passenger name: Full name as printed on ticket (usually in format: LASTNAME/FIRSTNAME)
2. Flight number: Airline code + number (e.g., "AA 1234", "BA 456", "DL 789")
3. Departure: City name or airport code of origin (e.g., "New York JFK", "London Heathrow", "LAX")
4. Arrival: City name or airport code of destination (e.g., "Paris CDG", "Tokyo Narita", "SFO")
5. Departure date: Format as YYYY-MM-DD (look for flight date, departure date)

HANDLING UNCLEAR DATA:
- If passenger name has "/" separator, keep it as is
- Include both city name and airport code if both are visible
- For date, look for departure date specifically (not booking date or arrival date)
- If text is unclear, make your best interpretation

Return ONLY a JSON object with these exact keys: name, flightNumber, departure, arrival, dateOfBirth (use departure date here). No additional text, explanations, or markdown.`;
    } else {
      prompt = `You are an expert OCR system. Analyze this document and identify what type it is.

STEPS:
1. Determine if this is a PASSPORT, VISA, or FLIGHT TICKET
2. Extract all relevant information based on document type
3. Use the appropriate field names for the identified document type

PASSPORT fields: name, passportNumber, dateOfBirth, nationality, expiryDate
VISA fields: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType
FLIGHT TICKET fields: name, flightNumber, departure, arrival, dateOfBirth (use departure date)

FORMATTING:
- All dates must be in YYYY-MM-DD format
- If a field is not found or unclear, use empty string ""
- Be as accurate as possible with OCR

Return ONLY a JSON object with available data. No additional text, explanations, or markdown.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse extracted data");
    }

    // Add document type to the extracted data
    extractedData.documentType = documentType;

    // Ensure all fields exist with defaults
    const completeData = {
      documentType: extractedData.documentType || "Unknown",
      name: extractedData.name || "",
      passportNumber: extractedData.passportNumber || "",
      dateOfBirth: extractedData.dateOfBirth || "",
      nationality: extractedData.nationality || "",
      expiryDate: extractedData.expiryDate || "",
      visaType: extractedData.visaType || "",
      flightNumber: extractedData.flightNumber || "",
      departure: extractedData.departure || "",
      arrival: extractedData.arrival || "",
    };

    return new Response(JSON.stringify({ extractedData: completeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-document-data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
