import { Router, Response } from "express";
import { prisma } from "@shinaa/database";
import { KeyCheckoutSchema } from "@shinaa/shared-types";
import { authenticateJWT, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Apply authentication to all key routes
router.use(authenticateJWT);
router.use(requireRole(["caretaker", "official"]));

// POST /api/keys/:id/checkout - Log checkout of a room key
router.post("/:id/checkout", async (req: AuthenticatedRequest, res: Response) => {
  const keyId = req.params.id;
  const loggedBy = req.user?.id;

  if (!loggedBy) {
    return res.status(401).json({ error: "User context missing" });
  }

  // Validate request body
  const validation = KeyCheckoutSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten().fieldErrors });
  }

  const { studentName, studentId, phoneNumber } = validation.data;

  try {
    // Check if key exists and is available
    const key = await prisma.key.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      return res.status(404).json({ error: "Key not found" });
    }

    // Create log record (no longer updates isAvailable)
    const log = await prisma.keyLog.create({
      data: {
        keyId,
        loggedBy,
        studentName,
        studentId,
        phoneNumber,
        timeOut: new Date(),
      },
    });

    return res.json({
      message: "Key checked out successfully",
      key,
      log,
    });
  } catch (error) {
    console.error("Key checkout error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

// POST /api/keys/:id/return - Log key return
router.post("/:id/return", async (req: AuthenticatedRequest, res: Response) => {
  const keyId = req.params.id;

  try {
    const key = await prisma.key.findUnique({
      where: { id: keyId },
    });

    const { logId } = req.body;

    if (!logId) {
      return res.status(400).json({ error: "logId is required in the request body" });
    }

    const logRecord = await prisma.keyLog.findUnique({
      where: { id: logId },
    });

    if (!logRecord || logRecord.keyId !== keyId) {
      return res.status(404).json({ error: "Checkout record not found or does not match this key" });
    }

    if (logRecord.timeIn !== null) {
      return res.status(400).json({ error: "Key checkout record is already closed (returned)" });
    }

    // Update active log to record key return
    const log = await prisma.keyLog.update({
      where: { id: logId },
      data: { timeIn: new Date() },
    });

    return res.json({
      message: "Key returned successfully",
      key,
      log,
    });
  } catch (error) {
    console.error("Key return error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
