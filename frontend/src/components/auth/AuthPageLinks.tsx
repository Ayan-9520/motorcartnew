import { Link } from "react-router-dom";

export function AuthPageLinks({
  prompt,
  linkLabel,
  linkTo,
}: {
  prompt: string;
  linkLabel: string;
  linkTo: string;
}) {
  return (
    <p className="auth-page-links text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link to={linkTo} className="font-semibold text-primary hover:underline">
        {linkLabel}
      </Link>
    </p>
  );
}
