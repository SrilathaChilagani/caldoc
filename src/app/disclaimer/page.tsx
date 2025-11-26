// src/app/disclaimer/page.tsx
export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-4 text-sm text-zinc-800">
      <h1 className="text-2xl font-semibold mb-4">Teleconsultation Disclaimer</h1>

      <p>
        This platform enables remote medical consultations through audio/video and
        online messaging. It is <strong>not</strong> intended for life-threatening
        or emergency conditions.
      </p>

      <p>
        In case of any emergency or serious symptoms (such as severe chest pain,
        difficulty breathing, loss of consciousness, major bleeding, or suspected
        stroke), please call your local emergency number immediately or visit the
        nearest hospital.
      </p>

      <p>
        Due to the nature of telemedicine, the doctor may have limitations in
        performing a physical examination. Recommendations are based on the
        information shared by you, and you may be advised to undergo tests or
        seek an in-person consultation if needed.
      </p>

      <p>
        By using this platform, you consent to teleconsultation and understand the
        above limitations and instructions.
      </p>
    </main>
  );
}
