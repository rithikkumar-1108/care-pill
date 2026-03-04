import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a medical prescription parser. Given a prescription image, extract all medicines and their details.

Return a JSON object with this exact structure:
{
  "medicines": [
    {
      "name": "Medicine Name",
      "dosage": "500",
      "dosage_unit": "mg",
      "frequency": "1-0-1",
      "instructions": "after food",
      "duration_days": 5,
      "morning_enabled": true,
      "afternoon_enabled": false,
      "night_enabled": true,
      "morning_time": "08:00",
      "afternoon_time": "14:00",
      "night_time": "20:00",
      "confidence": "high"
    }
  ],
  "raw_text": "Full extracted text from the prescription",
  "doctor_name": "Dr. Name if visible",
  "date": "Prescription date if visible"
}

Frequency mapping rules:
- "1-0-1" or "BD" or "twice daily" → morning + night
- "1-1-1" or "TDS" or "thrice daily" → morning + afternoon + night
- "0-1-0" → afternoon only
- "1-0-0" or "OD morning" → morning only
- "0-0-1" or "OD night" or "HS" → night only
- "0-1-1" → afternoon + night
- "1-1-0" → morning + afternoon

For dosage_unit, use one of: tablet, capsule, ml, mg, drops, puff, patch, injection.
For confidence, use: "high", "medium", or "low" based on how clearly you can read the text.
If handwriting is unclear, still attempt extraction and mark confidence as "low".
Always return valid JSON.`;

    const userContent: any[] = [
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
        },
      },
      {
        type: "text",
        text: "Extract all medicine details from this prescription image. Return the structured JSON as specified.",
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, return raw text for manual entry
      parsed = {
        medicines: [],
        raw_text: content,
        parse_error: true,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-prescription error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
