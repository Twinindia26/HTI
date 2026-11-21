import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";

async function RequireAdmin({ children }) {
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

  const response = await fetch(`${getApiBaseUrl()}/admin/access`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/");
  }

  return children;
}

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <RequireAdmin>{children}</RequireAdmin>
    </Suspense>
  );
}
