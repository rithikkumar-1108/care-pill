import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  patientId: string;
  caregiverEmail: string;
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(RESEND_API_KEY);

    const { patientId, caregiverEmail, alertType, medicineName, patientName, additionalInfo }: EmailRequest = await req.json();

    if (!caregiverEmail || !alertType || !medicineName || !patientName) {
      throw new Error("Missing required fields");
    }

    // Build email content based on alert type
    let subject = "";
    let htmlContent = "";

    if (alertType === "missed_dose") {
      subject = `⚠️ Missed Dose Alert: ${patientName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Missed Dose Alert</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
              <strong>${patientName}</strong> has missed their scheduled dose.
            </p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Medicine:</strong> ${medicineName}<br>
                ${additionalInfo ? `<strong>Details:</strong> ${additionalInfo}` : ""}
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Please check on ${patientName} to ensure they take their medicine or if they need assistance.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This alert was sent by CarePill - Your Medicine Reminder Companion
            </p>
          </div>
        </div>
      `;
    } else if (alertType === "low_stock") {
      subject = `💊 Low Stock Alert: ${medicineName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💊 Low Stock Alert</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
              <strong>${patientName}</strong>'s medicine supply is running low.
            </p>
            <div style="background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #5b21b6;">
                <strong>Medicine:</strong> ${medicineName}<br>
                ${additionalInfo ? `<strong>Remaining Stock:</strong> ${additionalInfo}` : ""}
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Please arrange to refill ${patientName}'s prescription soon to avoid running out.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This alert was sent by CarePill - Your Medicine Reminder Companion
            </p>
          </div>
        </div>
      `;
    }

    // Note: Replace 'onboarding@resend.dev' with your verified domain email
    const emailResponse = await resend.emails.send({
      from: "CarePill <onboarding@resend.dev>",
      to: [caregiverEmail],
      subject: subject,
      html: htmlContent,
    });

    // Log notification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("notification_logs").insert({
      user_id: patientId,
      notification_type: `email_${alertType}`,
      recipient_email: caregiverEmail,
      message: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error sending email:", error);
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
