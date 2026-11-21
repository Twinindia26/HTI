import {
  deletePartnerApplication,
  listApprovedPartners,
  listPartnerApplications,
  reviewPartnerApplication,
  submitPartnerApplication,
} from "../services/partner.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseCoordinate(value, min, max) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : Number.NaN;
}

export async function submitPartnerApplicationController(request, response) {
  const data = request.body || {};
  const partnerType = data.partnerType;
  const requiredText = ["businessName", "contactName", "phone", "postalCode", "address"];
  const latitude = parseCoordinate(data.latitude, -90, 90);
  const longitude = parseCoordinate(data.longitude, -180, 180);
  const email = typeof data.email === "string" ? data.email.trim() : "";

  if (
    !["pharmacy", "diagnostic"].includes(partnerType) ||
    requiredText.some((key) => typeof data[key] !== "string" || !data[key].trim()) ||
    data.businessName.length > 255 || data.contactName.length > 255 ||
    data.phone.length > 40 || !/^\d{6}$/.test(data.postalCode) ||
    data.address.length > 2000 ||
    (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    Number.isNaN(latitude) || Number.isNaN(longitude) ||
    (data.licenseDetails != null && (typeof data.licenseDetails !== "string" || data.licenseDetails.length > 2000)) ||
    (data.services != null && (typeof data.services !== "string" || data.services.length > 2000))
  ) {
    return response.status(400).json({ error: "Provide valid partner details and a 6-digit postal code." });
  }
  const application = await submitPartnerApplication({
    userId: request.user.id,
    partnerType,
    businessName: data.businessName.trim(),
    contactName: data.contactName.trim(),
    phone: data.phone.trim(),
    email: email || null,
    postalCode: data.postalCode,
    address: data.address.trim(),
    latitude,
    longitude,
    licenseDetails: data.licenseDetails?.trim(),
    services: data.services?.trim(),
  });
  return response.status(201).json({ application });
}

export async function getApprovedPartners(request, response) {
  const postalCode = request.query.postalCode;
  if (postalCode != null && postalCode !== "" && !/^\d{6}$/.test(postalCode)) {
    return response.status(400).json({ error: "Postal code must contain exactly 6 digits." });
  }
  const lat = parseCoordinate(request.query.lat, -90, 90);
  const lng = parseCoordinate(request.query.lng, -180, 180);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return response.status(400).json({ error: "Invalid location coordinates." });
  }
  const partnerType = request.query.partnerType;
  const partners = await listApprovedPartners({
    postalCode: postalCode || null,
    lat,
    lng,
    partnerType: ["pharmacy", "diagnostic"].includes(partnerType) ? partnerType : null,
  });
  return response.status(200).json({ partners });
}

export async function reverseGeocodeLocation(request, response) {
  const lat = parseCoordinate(request.query.lat, -90, 90);
  const lng = parseCoordinate(request.query.lng, -180, 180);
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return response.status(400).json({ error: "Valid latitude and longitude are required." });
  }

  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      {
        headers: { "User-Agent": "HealthTwinIndia/1.0" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!geoResponse.ok) {
      return response.status(200).json({ postalCode: null, city: null });
    }
    const geoData = await geoResponse.json();
    const rawPostcode = String(geoData?.address?.postcode || "").replace(/\D/g, "");
    const postalCode = rawPostcode.length >= 6 ? rawPostcode.slice(0, 6) : null;
    const city = geoData?.address?.city || geoData?.address?.town || geoData?.address?.state_district || null;
    return response.status(200).json({ postalCode, city });
  } catch {
    return response.status(200).json({ postalCode: null, city: null });
  }
}

export async function getPartnerApplications(_request, response) {
  const applications = await listPartnerApplications();
  return response.status(200).json({ applications });
}

export async function reviewPartnerApplicationController(request, response) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Application ID must be a positive integer." });
  const application = await reviewPartnerApplication({
    applicationId: id,
    adminId: request.user.id,
    decision: request.body?.decision,
  });
  if (!application) return response.status(404).json({ error: "Partner application not found." });
  return response.status(200).json({ application });
}

export async function deletePartnerApplicationController(request, response) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Application ID must be a positive integer." });
  const deleted = await deletePartnerApplication({
    applicationId: id,
    adminId: request.user.id,
  });
  if (!deleted) return response.status(404).json({ error: "Partner application not found." });
  return response.status(200).json({ deleted });
}