import twilio from "twilio";

export const TWILIO_CONFIGURED = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

export function getTwilioClient() {
  if (!TWILIO_CONFIGURED) throw new Error("Twilio credentials not configured");
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export const TWILIO_FROM_SMS = process.env.TWILIO_PHONE_NUMBER || "";
export const TWILIO_FROM_WA = process.env.TWILIO_WHATSAPP_NUMBER
  ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER.replace("whatsapp:", "")}`
  : `whatsapp:${process.env.TWILIO_PHONE_NUMBER || ""}`;

export const ARAB_COUNTRY_CODES = ["+966", "+971", "+20", "+965", "+968", "+973", "+974", "+962", "+961", "+963", "+964", "+967", "+218", "+216", "+213", "+212"];
