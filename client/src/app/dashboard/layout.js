import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";

async function RequirePatientOrDoctor({ children }) {
  const { userId, getToken } = await auth();
  if (!userId) {
    redirect("/");
  }

  const token = await getToken();
  if (!token) {
    redirect("/");
  }

  const syncResponse = await fetch(`${getApiBaseUrl()}/auth/sync-user`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!syncResponse.ok) {
    redirect("/");
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/");
  }

  const { user } = await response.json();
  if (!["PATIENT", "DOCTOR"].includes(user?.role)) {
    redirect("/");
  }

  return children;
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <RequirePatientOrDoctor>{children}</RequirePatientOrDoctor>
    </Suspense>
  );
}