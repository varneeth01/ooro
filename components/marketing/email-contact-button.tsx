"use client";

type EmailContactButtonProps = {
  email: string;
  className?: string;
  subject?: string;
  body?: string;
  label?: string;
};

export function EmailContactButton({ email, className, subject, body, label }: EmailContactButtonProps) {
  const [local, domain] = email.split("@");
  const mailto = new URL(`mailto:${email}`);
  if (subject) mailto.searchParams.set("subject", subject);
  if (body) mailto.searchParams.set("body", body);

  return (
    <button
      type="button"
      className={className}
      aria-label={label ? `${label}: ${local} at ${domain}` : `Email ${local} at ${domain}`}
      onClick={() => window.location.assign(mailto.toString())}
    >
      {label ? <span>{label}</span> : <><span>{local}</span><span aria-hidden="true">@</span><span>{domain}</span></>}
    </button>
  );
}
