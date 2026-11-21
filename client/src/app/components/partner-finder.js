"use client";

import { useState } from "react";
import { getApiBaseUrl } from "../lib/api";

export default function PartnerFinder() {
  const [postalCode, setPostalCode] = useState("");
  const [coords, setCoords] = useState(null);
  const [partners, setPartners] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function searchPartners({ pin = postalCode, location = coords } = {}) {
    const cleanPin = pin.trim();
    if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
      setStatusMessage("Please enter a valid 6-digit PIN code.");
      return;
    }
    if (!cleanPin && !location) {
      setStatusMessage("Enter a 6-digit PIN code or click 'Use my location'.");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    try {
      const params = new URLSearchParams({ partnerType: "pharmacy" });
      if (cleanPin) params.set("postalCode", cleanPin);
      if (location) {
        params.set("lat", String(location.lat));
        params.set("lng", String(location.lng));
      }
      const response = await fetch(`${getApiBaseUrl()}/partners?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Could not search nearby medicine shops.");
      }
      setPartners(result.partners || []);
      setSearched(true);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported in this browser. Please enter your PIN code.");
      return;
    }

    setLocating(true);
    setStatusMessage("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(location);
        let detectedPin = postalCode;

        try {
          const geoRes = await fetch(
            `${getApiBaseUrl()}/partners/reverse-geocode?lat=${location.lat}&lng=${location.lng}`,
          );
          const geo = await geoRes.json().catch(() => ({}));
          if (geo.postalCode) {
            detectedPin = geo.postalCode;
            setPostalCode(geo.postalCode);
            setStatusMessage(
              `Location detected${geo.city ? ` (${geo.city})` : ""} · PIN: ${geo.postalCode}`,
            );
          } else {
            setStatusMessage("Location detected. Showing nearby shops (enter PIN code to refine).");
          }
        } catch {
          setStatusMessage("Location detected. Searching nearby shops...");
        } finally {
          setLocating(false);
        }

        await searchPartners({ pin: detectedPin, location });
      },
      () => {
        setLocating(false);
        setStatusMessage("Could not access location permission. Please enter your 6-digit PIN code.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form
      className="search-panel finder-search"
      onSubmit={(event) => {
        event.preventDefault();
        searchPartners();
      }}
    >
      <label>
        Enter PIN code
        <input
          inputMode="numeric"
          maxLength="6"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="e.g. 700001"
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Searching..." : "Search partners"}
      </button>
      <button
        type="button"
        className="small-btn location-btn"
        onClick={handleUseMyLocation}
        disabled={locating}
      >
        {locating ? "Locating..." : "Use my location"}
      </button>

      {statusMessage && <p role="status" className="wide">{statusMessage}</p>}

      <div className="search-results">
        {!searched ? (
          "Enter your 6-digit PIN code or click 'Use my location' to find approved medicine shops near you."
        ) : partners.length === 0 ? (
          "No approved medicine shop is currently listed for this PIN code or nearby area."
        ) : (
          partners.map((shop) => (
            <article key={shop.id} className="request-result">
              <div className="request-result-head">
                <div>
                  <b>{shop.business_name}</b>
                  <small>PIN {shop.postal_code}{shop.distance_km != null ? ` · ~${shop.distance_km} km away` : ""}</small>
                </div>
                <span className="status verified">Approved</span>
              </div>
              <p>{shop.address}</p>
              <p><b>Contact:</b> {shop.contact_name || "Store Desk"} · <a href={`tel:${shop.phone}`}>{shop.phone}</a></p>
              {shop.services && <p><small>Services: {shop.services}</small></p>}
            </article>
          ))
        )}
      </div>
    </form>
  );
}