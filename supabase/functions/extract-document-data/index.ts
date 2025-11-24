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
      prompt = `Extract the following information from this passport document:
- Full name (as shown on passport)
- Passport number
- Date of birth (format: YYYY-MM-DD)
- Nationality
- Expiry date (format: YYYY-MM-DD)

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate. No additional text.`;
    } else if (lowerFileName.includes("visa")) {
      documentType = "Visa";
      prompt = `Extract the following information from this visa document:
- Full name
- Passport number (if visible)
- Date of birth (format: YYYY-MM-DD)
- Nationality
- Visa expiry date (format: YYYY-MM-DD)
- Visa type

Return ONLY a JSON object with these exact keys: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType. No additional text.`;
    } else if (lowerFileName.includes("flight") || lowerFileName.includes("ticket")) {
      documentType = "Flight Ticket";
      prompt = `Extract the following information from this flight ticket:
- Passenger name
- Flight number
- Departure city/airport
- Arrival city/airport
- Departure date (format: YYYY-MM-DD)

Return ONLY a JSON object with these exact keys: name, flightNumber, departure, arrival, dateOfBirth (use departure date). No additional text.`;
    } else {
      prompt = `Identify what type of document this is (passport, visa, or flight ticket) and extract all relevant information.
Return ONLY a JSON object with available data using keys: name, passportNumber, dateOfBirth, nationality, expiryDate, visaType, flightNumber, departure, arrival. No additional text.`;
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
