// maybe src/lib/labels.ts
export function humanStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Waiting for payment confirmation";
    case "CONFIRMED":
      return "Confirmed";
    case "IN_PROGRESS":
      return "In consultation";
    case "COMPLETED":
      return "Completed";
    case "NO_SHOW":
      return "Patient did not join";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}
