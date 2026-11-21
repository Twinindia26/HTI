import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "Health Twin India",
  description: "Connected healthcare for families, providers, and communities.",
};

function hasValidClerkKey(value) {
  return typeof value === "string" && value.startsWith("pk_") && !value.includes("your_key") && !value.includes("replace_me");
}

export default function RootLayout({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const body = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!hasValidClerkKey(publishableKey)) {
    return body;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      {body}
    </ClerkProvider>
  );
}
