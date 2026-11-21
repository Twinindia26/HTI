import { Router } from "express";
import { getPublications } from "../controllers/publication.controller.js";

const router = Router();
router.get("/", getPublications);

export default router;
