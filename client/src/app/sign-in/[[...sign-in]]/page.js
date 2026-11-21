import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import SiteShell from "@/app/components/site-shell";

export default function SignInPage() {
  return (
    <SiteShell>
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem 1rem" }}>
        <Suspense fallback={<div>Loading...</div>}>
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </Suspense>
      </div>
    </SiteShell>
  );
}