// src/lib/razorpay.ts
import Razorpay from "razorpay";
export const rzp = new Razorpay({
  key_id: process.env.RZP_KEY!,
  key_secret: process.env.RZP_SECRET!,
});
