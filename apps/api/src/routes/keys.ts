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

    if (!key.isAvailable) {
      return res.status(400).json({ error: "Key is already checked out" });
    }

    // Perform transaction: update key availability and create log record
    const [updatedKey, log] = await prisma.$transaction([
      prisma.key.update({
        where: { id: keyId },
        data: { isAvailable: false },
      }),
      prisma.keyLog.create({
        data: {
          keyId,
          loggedBy,
          studentName,
          studentId,
          phoneNumber,
          timeOut: new Date(),
        },
      }),
    ]);

    return res.json({
      message: "Key checked out successfully",
      key: updatedKey,
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

    if (!key) {
      return res.status(404).json({ error: "Key not found" });
    }

    // Find the active open log for this key
    const activeLog = await prisma.keyLog.findFirst({
      where: {
        keyId,
        timeIn: null,
      },
    });

    if (!activeLog) {
      return res.status(400).json({ error: "No active checkout log found for this key" });
    }

    // Perform transaction: update key availability and update active log
    const [updatedKey, log] = await prisma.$transaction([
      prisma.key.update({
        where: { id: keyId },
        data: { isAvailable: true },
      }),
      prisma.keyLog.update({
        where: { id: activeLog.id },
        data: { timeIn: new Date() },
      }),
    ]);

    return res.json({
      message: "Key returned successfully",
      key: updatedKey,
      log,
    });
  } catch (error) {
    console.error("Key return error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
