import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import SiteShell from "@/app/components/site-shell";

export default function SignUpPage() {
  return (
    <SiteShell>
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem 1rem" }}>
        <Suspense fallback={<div>Loading...</div>}>
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </Suspense>
      </div>
    </SiteShell>
  );
}