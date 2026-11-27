/**
 * Leegality eSign stub.
 * Register at leegality.com and add LEEGALITY_API_KEY + LEEGALITY_API_URL to Vercel env.
 * Until credentials are present every call returns a stub response so the UI can be built
 * and tested end-to-end without a live integration.
 */

export interface SignPrescriptionResult {
  success: boolean;
  documentId?: string;    // Leegality document ID (stored in Prescription.signatureDocId)
  signUrl?: string;       // Deep-link URL for provider to complete DSC signing
  stub?: boolean;         // true when running without live credentials
  error?: string;
}

/**
 * Trigger an eSign request for a prescription PDF stored in S3.
 * pdfS3Key — the S3 key of the PDF to sign
 * signerEmail — provider email to receive the signing invitation
 * signerName — provider display name
 */
export async function signPrescription(params: {
  pdfS3Key: string;
  signerEmail: string;
  signerName: string;
  rxId: string;
}): Promise<SignPrescriptionResult> {
  const apiKey = process.env.LEEGALITY_API_KEY;
  const apiUrl = process.env.LEEGALITY_API_URL ?? "https://sandbox.leegality.com/api/v3.0";

  if (!apiKey) {
    console.warn("[leegality] LEEGALITY_API_KEY not set — returning stub response");
    return {
      success: true,
      documentId: `stub_doc_${params.rxId}`,
      signUrl: `https://sandbox.leegality.com/sign/stub_${params.rxId}`,
      stub: true,
    };
  }

  try {
    // Build signed document upload + invite request
    // Leegality v3 API: POST /document
    const res = await fetch(`${apiUrl}/document`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Prescription-${params.rxId}.pdf`,
        // s3Key or document URL — depends on Leegality plan (URL-based or base64 upload)
        // Using document URL approach; presign it server-side before calling this function
        documentUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${params.pdfS3Key}`,
        signers: [
          {
            name: params.signerName,
            email: params.signerEmail,
            type: "DSC", // Digital Signature Certificate
          },
        ],
        sendInvite: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Leegality API ${res.status}: ${body}` };
    }

    const data = await res.json();
    return {
      success: true,
      documentId: data.documentId ?? data.id,
      signUrl: data.signers?.[0]?.signUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[leegality] signPrescription failed:", msg);
    return { success: false, error: msg };
  }
}
