import cors from "cors";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { env, hasValidClerkKeys } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { handleClerkWebhook } from "./controllers/clerk-webhook.controller.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import publicationRoutes from "./routes/publication.routes.js";
import partnerRoutes from "./routes/partner.routes.js";
import workshopRoutes from "./routes/workshop.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import healthDataRoutes from "./routes/health-data.routes.js";

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.post("/api/webhooks/clerk", express.raw({ type: "application/json" }), handleClerkWebhook);
app.use(express.json());

if (hasValidClerkKeys()) {
  app.use(clerkMiddleware());
}

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/publications", publicationRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", healthDataRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
