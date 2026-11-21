import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";

async function RequireDoctor({ children }) {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/");
  const token = await getToken();
  if (!token) redirect("/");
  const response = await fetch(`${getApiBaseUrl()}/doctor/access`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) redirect("/doctor-application");
  return children;
}

export default function DoctorLayout({ children }) {
  return <Suspense fallback={null}><RequireDoctor>{children}</RequireDoctor></Suspense>;
}
