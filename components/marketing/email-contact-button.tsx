"use client";

type EmailContactButtonProps = {
  email: string;
  className?: string;
};

export function EmailContactButton({ email, className }: EmailContactButtonProps) {
  const [local, domain] = email.split("@");

  return (
    <button
      type="button"
      className={className}
      aria-label={`Email ${local} at ${domain}`}
      onClick={() => window.location.assign(`mailto:${email}`)}
    >
      <span>{local}</span>
      <span aria-hidden="true">@</span>
      <span>{domain}</span>
    </button>
  );
}
