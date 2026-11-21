"use client";

import { SignInButton, Show, useAuth, useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncDatabaseUser } from "../lib/api";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Our Services" },
  { href: "/request", label: "Submit Request" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/partners", label: "Partner Registration" },
  { href: "/publications", label: "Publications" },
  { href: "/workshops", label: "Workshops" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function hasValidClerkKey() {
  return typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string"
    && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_")
    && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_key")
    && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace_me");
}

function AuthNav() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountResult, setAccountResult] = useState({ userId: null, user: null, error: null });
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    if (!authLoaded || !isSignedIn || !user?.id) {
      return () => {
        active = false;
      };
    }

    syncDatabaseUser(user.id, getToken)
      .then((databaseUser) => {
        if (active) {
          setAccountResult({ userId: user.id, user: databaseUser, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setAccountResult({ userId: user.id, user: null, error });
          console.error("Unable to load the Health Twin India account role:", error);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoaded, getToken, isSignedIn, user?.id]);

  const account = accountResult.userId === user?.id ? accountResult.user : null;
  const accountError = accountResult.userId === user?.id ? accountResult.error : null;
  const userRole = account?.role || (accountError ? "Role unavailable" : "Loading role...");
  const userName = user?.fullName || user?.firstName || "Member";
  const initial = userName.charAt(0)?.toUpperCase() || "U";

  if (!authLoaded || !isLoaded) {
    return <div className="profile-shell placeholder-shell" />;
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="btn btn-outline">
            Sign in
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <div className="profile-shell">
          <button type="button" className="profile-chip" onClick={() => setProfileOpen((open) => !open)}>
            {user?.imageUrl ? (
              <img className="avatar" src={user.imageUrl} alt="" />
            ) : (
              <span className="avatar">{initial}</span>
            )}
            <span className="profile-text">
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </span>
          </button>

          {profileOpen && (
            <div className="profile-menu">
              {accountError ? (
                <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "#b91c1c" }}>
                  {accountError.message || "Backend sync error. Check server."}
                </div>
              ) : account?.role === "ADMIN" ? (
                <>
                  <Link href="/admin" onClick={() => setProfileOpen(false)}>Admin Dashboard</Link>
                  <Link href="/admin/prescriptions" onClick={() => setProfileOpen(false)}>Verify Prescriptions</Link>
                  <Link href="/admin/articles" onClick={() => setProfileOpen(false)}>Review Doctor Blogs</Link>
                  <Link href="/admin/partners" onClick={() => setProfileOpen(false)}>Partner Shops &amp; Doctors</Link>
                </>
              ) : account?.role === "DOCTOR" ? (
                <>
                  <Link href="/doctor" onClick={() => setProfileOpen(false)}>Doctor Workspace (Blogs)</Link>
                  <Link href="/dashboard" onClick={() => setProfileOpen(false)}>Patient Dashboard</Link>
                  <Link href="/request" onClick={() => setProfileOpen(false)}>Upload Prescription</Link>
                  <Link href="/#partnerFinder" onClick={() => setProfileOpen(false)}>Nearby Medicine Shops</Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setProfileOpen(false)}>My Dashboard</Link>
                  <Link href="/dashboard/requests" onClick={() => setProfileOpen(false)}>My Prescriptions</Link>
                  <Link href="/request" onClick={() => setProfileOpen(false)}>Upload Prescription</Link>
                  <Link href="/doctor-application" onClick={() => setProfileOpen(false)}>Apply as Doctor</Link>
                </>
              )}

              <button
                type="button"
                className="profile-signout"
                onClick={async () => {
                  try {
                    await signOut();
                    router.push("/");
                  } catch (error) {
                    console.error("Unable to sign out of Clerk:", error);
                  }
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </Show>
    </>
  );
}

function StaticNavAuth() {
  return (
    <button
      type="button"
      className="btn btn-outline"
      disabled
      title="Clerk authentication is not configured in this environment."
    >
      Sign in
    </button>
  );
}

export default function SiteShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const useClerkAuth = hasValidClerkKey();

  return (
    <div className="site-shell">
      <header className="nav wrap">
        <Link href="/" className="brand" aria-label="Health Twin India home">
          <img src="/images/hti-logo.png" alt="Health Twin India logo" />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          id="menuToggle"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {menuOpen && (
          <div
            className="nav-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <nav id="mainNav" className={menuOpen ? "open" : ""}>
          <div className="mobile-nav-head">
            <span className="mobile-nav-title">Menu</span>
            <button
              type="button"
              className="mobile-nav-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {useClerkAuth ? <AuthNav /> : <StaticNavAuth />}
        </div>
      </header>

      <main>{children}</main>

      <footer>
        <div className="wrap footer-main">
          <div className="brand footer-brand">
            <img src="/images/hti-logo.png" alt="Health Twin India" />
            <span>
              <b>
                Health Twin <em>India</em>
              </b>
              <small>One Platform. One Health Journey.</small>
            </span>
          </div>

          <div>
            <b>Explore</b>
            <Link href="/services">Services</Link>
            <Link href="/request">Submit request</Link>
            <Link href="/partners">Partner registration</Link>
            <Link href="/publications">Publications</Link>
          </div>

          <div>
            <b>Company</b>
            <Link href="/about">About us</Link>
            <Link href="/contact">Contact</Link>
            <a href="#">Privacy policy*</a>
            <a href="#">Terms*</a>
          </div>

          <div>
            <b>Stay connected</b>
            <a href="mailto:healthtwinindia@gmail.com">healthtwinindia@gmail.com</a>
            <a href="tel:+919242059087">+91 92420 59087</a>
            <a href="https://wa.me/919242059087" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a href="https://whatsapp.com/channel/0029Vb8AaaD7YScywlsxYv47" target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>
            <a href="https://www.facebook.com/share/191LtS4AUF/" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.linkedin.com/company/health-twin-india/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://www.instagram.com/healthtwinindiaofficial/" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
        </div>
        <div className="wrap copyright">
          <span>© 2026 Health Twin India. All rights reserved.</span>
          <span>Website prototype · *Add reviewed legal policies before launch</span>
        </div>
      </footer>
    </div>
  );
}