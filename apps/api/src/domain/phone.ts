/** Normalize an Indian mobile number to the canonical +91XXXXXXXXXX form. */
export function normalizeIndianPhone(input: string): string | null {
  let value = input.trim().replace(/[\s\-()]/g, "");
  if (value.startsWith("+91")) value = value.slice(3);
  else if (value.startsWith("0091")) value = value.slice(4);
  else if (value.startsWith("091")) value = value.slice(3);
  else if (value.startsWith("91") && value.length === 12) value = value.slice(2);
  if (value.startsWith("0") && value.length === 11) value = value.slice(1);
  return /^[6-9]\d{9}$/.test(value) ? `+91${value}` : null;
}
