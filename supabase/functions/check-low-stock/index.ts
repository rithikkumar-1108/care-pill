import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for low stock medicines...");

    // Get all active medicines with low stock
    const { data: lowStockMedicines, error: medsError } = await supabase
      .from("medicines")
      .select("*")
      .eq("is_active", true)
      .filter("stock_quantity", "lte", supabase.rpc("get_low_stock_threshold"));

    // Fallback: Get medicines where stock <= threshold manually
    const { data: allMedicines, error: allMedsError } = await supabase
      .from("medicines")
      .select("*")
      .eq("is_active", true);

    if (allMedsError) {
      throw new Error(`Error fetching medicines: ${allMedsError.message}`);
    }

    const lowStock = allMedicines?.filter(
      (med) => med.stock_quantity <= med.low_stock_threshold
    ) || [];

    if (lowStock.length === 0) {
      console.log("No low stock medicines found");
      return new Response(
        JSON.stringify({ success: true, message: "No low stock", alertsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsSent = 0;

    for (const medicine of lowStock) {
      // Check if we already sent an alert for this medicine today
      const today = new Date().toISOString().split("T")[0];
      const { data: existingAlert } = await supabase
        .from("stock_alerts")
        .select("id")
        .eq("medicine_id", medicine.id)
        .eq("alert_type", "low_stock_caregiver")
        .gte("created_at", `${today}T00:00:00`)
        .single();

      if (existingAlert) {
        console.log(`Already sent alert for medicine ${medicine.name} today`);
        continue;
      }

      // Get patient profile
      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", medicine.user_id)
        .single();

      if (!patientProfile) continue;

      // Get linked caregivers
      const { data: caregiverLinks } = await supabase
        .from("caregiver_links")
        .select("caregiver_id")
        .eq("patient_id", medicine.user_id)
        .eq("status", "accepted");

      const baseUrl = supabaseUrl.replace("/rest/v1", "");
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

      // Send to linked caregivers
      if (caregiverLinks && caregiverLinks.length > 0) {
        for (const link of caregiverLinks) {
          const { data: userData } = await supabase.auth.admin.getUserById(link.caregiver_id);
          
          if (userData?.user?.email) {
            try {
              await fetch(`${baseUrl}/functions/v1/send-caregiver-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${anonKey}`,
                },
                body: JSON.stringify({
                  patientId: medicine.user_id,
                  caregiverEmail: userData.user.email,
                  alertType: "low_stock",
                  medicineName: medicine.name,
                  patientName: patientProfile.full_name,
                  additionalInfo: `${medicine.stock_quantity} remaining`,
                }),
              });
              alertsSent++;
            } catch (error) {
              console.error(`Failed to send email:`, error);
            }
          }
        }
      }

      // Also check legacy caregiver fields
      if (patientProfile.caregiver_email) {
        try {
          await fetch(`${baseUrl}/functions/v1/send-caregiver-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              patientId: medicine.user_id,
              caregiverEmail: patientProfile.caregiver_email,
              alertType: "low_stock",
              medicineName: medicine.name,
              patientName: patientProfile.full_name,
              additionalInfo: `${medicine.stock_quantity} remaining`,
            }),
          });
          alertsSent++;
        } catch (error) {
          console.error(`Failed to send email:`, error);
        }
      }

      if (patientProfile.caregiver_phone) {
        try {
          await fetch(`${baseUrl}/functions/v1/send-caregiver-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              patientId: medicine.user_id,
              caregiverPhone: patientProfile.caregiver_phone,
              alertType: "low_stock",
              medicineName: medicine.name,
              patientName: patientProfile.full_name,
              additionalInfo: `${medicine.stock_quantity} remaining`,
            }),
          });
          alertsSent++;
        } catch (error) {
          console.error(`Failed to send SMS:`, error);
        }
      }

      // Record the alert to prevent duplicates
      await supabase.from("stock_alerts").insert({
        medicine_id: medicine.id,
        user_id: medicine.user_id,
        alert_type: "low_stock_caregiver",
      });
    }

    console.log(`Low stock alerts sent: ${alertsSent}`);

    return new Response(
      JSON.stringify({ success: true, alertsSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error checking low stock:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
