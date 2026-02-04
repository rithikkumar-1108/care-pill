import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  patientId: string;
  caregiverPhone: string;
  alertType: "missed_dose" | "low_stock";
  medicineName: string;
  patientName: string;
  additionalInfo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    const { patientId, caregiverPhone, alertType, medicineName, patientName, additionalInfo }: SMSRequest = await req.json();

    if (!caregiverPhone || !alertType || !medicineName || !patientName) {
      throw new Error("Missing required fields");
    }

    // Build message based on alert type
    let message = "";
    if (alertType === "missed_dose") {
      message = `⚠️ CarePill Alert: ${patientName} missed their ${medicineName} dose. ${additionalInfo || "Please check on them."}`;
    } else if (alertType === "low_stock") {
      message = `💊 CarePill Alert: ${patientName}'s ${medicineName} is running low. ${additionalInfo || "Stock: " + additionalInfo}`;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", caregiverPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      throw new Error(`Twilio API error: ${twilioData.message || "Unknown error"}`);
    }

    // Log notification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("notification_logs").insert({
      user_id: patientId,
      notification_type: `sms_${alertType}`,
      recipient_phone: caregiverPhone,
      message: message,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    console.log("SMS sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioData.sid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
