import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MISSED_DOSE_THRESHOLD_MINUTES = 5;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    console.log(`Checking for missed doses at ${now.toISOString()}`);

    // Get all pending doses for today
    const { data: pendingDoses, error: dosesError } = await supabase
      .from("dose_logs")
      .select(`
        *,
        medicine:medicines(*)
      `)
      .eq("scheduled_date", today)
      .eq("status", "pending");

    if (dosesError) {
      throw new Error(`Error fetching doses: ${dosesError.message}`);
    }

    if (!pendingDoses || pendingDoses.length === 0) {
      console.log("No pending doses found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending doses", alertsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsSent = 0;

    for (const dose of pendingDoses) {
      // Get the session schedule time for this user and session type
      const { data: schedule } = await supabase
        .from("session_schedules")
        .select("scheduled_time")
        .eq("user_id", dose.user_id)
        .eq("session_type", dose.session_type)
        .single();

      if (!schedule) continue;

      const scheduledTime = schedule.scheduled_time.slice(0, 5); // HH:MM
      
      // Calculate time difference
      const [schedHour, schedMin] = scheduledTime.split(":").map(Number);
      const [currHour, currMin] = currentTime.split(":").map(Number);
      
      const scheduledMinutes = schedHour * 60 + schedMin;
      const currentMinutes = currHour * 60 + currMin;
      const minutesPassed = currentMinutes - scheduledMinutes;

      // Check if 5 minutes have passed since scheduled time
      if (minutesPassed >= MISSED_DOSE_THRESHOLD_MINUTES && minutesPassed < MISSED_DOSE_THRESHOLD_MINUTES + 5) {
        // Get patient profile
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", dose.user_id)
          .single();

        if (!patientProfile) continue;

        // Get linked caregivers
        const { data: caregiverLinks } = await supabase
          .from("caregiver_links")
          .select("caregiver_id")
          .eq("patient_id", dose.user_id)
          .eq("status", "accepted");

        if (!caregiverLinks || caregiverLinks.length === 0) {
          // Check legacy caregiver fields in profile
          if (patientProfile.caregiver_email || patientProfile.caregiver_phone) {
            // Send alerts to legacy caregiver
            await sendAlerts(
              supabaseUrl,
              dose.user_id,
              patientProfile.full_name,
              dose.medicine?.name || "Unknown medicine",
              patientProfile.caregiver_email,
              patientProfile.caregiver_phone,
              "missed_dose",
              `Session: ${dose.session_type}, Scheduled: ${scheduledTime}`
            );
            alertsSent++;
          }
          continue;
        }

        // Get caregiver profiles
        for (const link of caregiverLinks) {
          const { data: caregiverProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", link.caregiver_id)
            .single();

          // Get caregiver's email from auth.users (we'll use profile email field if available)
          // For now, we'll use the caregiver's own profile email/phone if they have it set
          if (caregiverProfile) {
            // Get caregiver's auth email
            const { data: userData } = await supabase.auth.admin.getUserById(link.caregiver_id);
            
            if (userData?.user?.email) {
              await sendAlerts(
                supabaseUrl,
                dose.user_id,
                patientProfile.full_name,
                dose.medicine?.name || "Unknown medicine",
                userData.user.email,
                null,
                "missed_dose",
                `Session: ${dose.session_type}, Scheduled: ${scheduledTime}`
              );
              alertsSent++;
            }
          }
        }

        // Mark dose as missed
        await supabase
          .from("dose_logs")
          .update({ status: "missed" })
          .eq("id", dose.id);
      }
    }

    console.log(`Alerts sent: ${alertsSent}`);

    return new Response(
      JSON.stringify({ success: true, alertsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error checking missed doses:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

async function sendAlerts(
  supabaseUrl: string,
  patientId: string,
  patientName: string,
  medicineName: string,
  caregiverEmail: string | null,
  caregiverPhone: string | null,
  alertType: "missed_dose" | "low_stock",
  additionalInfo: string
) {
  const baseUrl = supabaseUrl.replace("/rest/v1", "");
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  // Send email if available
  if (caregiverEmail) {
    try {
      await fetch(`${baseUrl}/functions/v1/send-caregiver-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          patientId,
          caregiverEmail,
          alertType,
          medicineName,
          patientName,
          additionalInfo,
        }),
      });
      console.log(`Email alert sent to ${caregiverEmail}`);
    } catch (error) {
      console.error(`Failed to send email to ${caregiverEmail}:`, error);
    }
  }

  // Send SMS if available
  if (caregiverPhone) {
    try {
      await fetch(`${baseUrl}/functions/v1/send-caregiver-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          patientId,
          caregiverPhone,
          alertType,
          medicineName,
          patientName,
          additionalInfo,
        }),
      });
      console.log(`SMS alert sent to ${caregiverPhone}`);
    } catch (error) {
      console.error(`Failed to send SMS to ${caregiverPhone}:`, error);
    }
  }
}

serve(handler);
