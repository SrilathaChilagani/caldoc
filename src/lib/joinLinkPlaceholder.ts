export function getJoinLinkPlaceholder() {
  return (
    process.env.WHATSAPP_CONFIRM_LINK_PLACEHOLDER ||
    "You'll receive your video link 24 hours before the visit."
  );
}
