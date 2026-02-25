const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function getPromptForDocumentType(fileName: string): { documentType: string; prompt: string } {
  const lowerFileName = fileName.toLowerCase();
  let documentType = "Unknown";
  let prompt = "";

  if (lowerFileName.includes("passport")) {
    documentType = "Passport";
    prompt = `You are an expert OCR system specializing in passport document extraction. Analyze this passport image carefully.

CRITICAL INSTRUCTIONS:
- Look for the Machine Readable Zone (MRZ) at the bottom - it's the most reliable source
- Cross-reference printed text with MRZ data for accuracy

EXTRACT THE FOLLOWING:
1. Full name: Extract surname and given names exactly as printed
2. Passport number: Usually alphanumeric, 6-9 characters
3. Date of birth: Format EXACTLY as DD-MMM-YYYY (e.g., 15-Mar-1990)
4. Nationality: The country that issued the passport
5. Issue date: Format EXACTLY as DD-MMM-YYYY
6. Expiry date: Format EXACTLY as DD-MMM-YYYY

HANDLING UNCLEAR DATA:
- If a field is completely unreadable, use empty string ""
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, passportIssueDate, expiryDate. No additional text.`;
  } else if (lowerFileName.includes("visa")) {
    documentType = "Visa";
    prompt = `You are an expert OCR system specializing in visa document extraction. Analyze this visa document carefully.

EXTRACT THE FOLLOWING:
1. Full name: Extract exactly as printed on the visa
2. Passport number: May be printed on visa itself
3. Date of birth: Format EXACTLY as DD-MMM-YYYY
4. Nationality: Country of the passport holder
5. Visa expiry date: Format EXACTLY as DD-MMM-YYYY
6. Visa type: Category or type (e.g., "Tourist", "B1/B2", "Work")

HANDLING UNCLEAR DATA:
- If a field is not found, use empty string ""
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType. No additional text.`;
  } else if (lowerFileName.includes("flight") || lowerFileName.includes("ticket")) {
    documentType = "Flight Ticket";
    prompt = `You are an expert OCR system specializing in flight ticket and boarding pass extraction. Analyze this document carefully.

EXTRACT THE FOLLOWING:
1. Passenger name: Full name as printed on ticket
2. Flight number: Airline code + number (e.g., "AA 1234")
3. Booking reference: PNR or confirmation code (usually 6 alphanumeric characters)
4. Ticket number: The e-ticket number
5. Departure: City name or airport code of origin
6. Arrival: City name or airport code of destination
7. Transit stop: Layover city if any, empty if direct flight
8. Seat number: The assigned seat
9. Inflight meal: Meal preference if shown
10. Departure date: Format EXACTLY as DD-MMM-YYYY

HANDLING UNCLEAR DATA:
- If a field is not visible, use empty string ""
- DATE FORMAT MUST BE DD-MMM-YYYY with hyphens

Return ONLY a JSON object with these exact keys: name, flightNumber, bookingReference, ticketNumber, departure, arrival, transitStop, seatNumber, inflightMeal, dateOfBirth (use departure date here). No additional text.`;
  } else {
    prompt = `You are an expert OCR system. Analyze this document and identify what type it is.

Determine if this is a PASSPORT, VISA, or FLIGHT TICKET and extract all relevant information.

PASSPORT fields: name, passportNumber, dateOfBirth, nationality, passportIssueDate, expiryDate
VISA fields: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType
FLIGHT TICKET fields: name, flightNumber, bookingReference, ticketNumber, departure, arrival, transitStop, seatNumber, inflightMeal, dateOfBirth

All dates MUST be in DD-MMM-YYYY format. If a field is not found, use empty string "".

Return ONLY a JSON object with available data. No additional text.`;
  }

  return { documentType, prompt };
}

async function callAIGateway(prompt: string, image: string, apiKey: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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

    if (response.status === 402) {
      return response;
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

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

    const { documentType, prompt } = getPromptForDocumentType(fileName);

    const response = await callAIGateway(prompt, image, LOVABLE_API_KEY);

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait and try again.", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue.", code: "PAYMENT_REQUIRED" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let extractedData;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse extracted data");
    }

    extractedData.documentType = documentType;

    const completeData = {
      documentType: extractedData.documentType || "Unknown",
      name: extractedData.name || "",
      passportNumber: extractedData.passportNumber || "",
      dateOfBirth: extractedData.dateOfBirth || "",
      nationality: extractedData.nationality || "",
      passportIssueDate: extractedData.passportIssueDate || "",
      expiryDate: extractedData.expiryDate || "",
      visaType: extractedData.visaType || "",
      flightNumber: extractedData.flightNumber || "",
      bookingReference: extractedData.bookingReference || "",
      ticketNumber: extractedData.ticketNumber || "",
      departure: extractedData.departure || "",
      arrival: extractedData.arrival || "",
      transitStop: extractedData.transitStop || "",
      seatNumber: extractedData.seatNumber || "",
      inflightMeal: extractedData.inflightMeal || "",
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
