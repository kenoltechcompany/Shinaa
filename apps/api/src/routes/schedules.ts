import { Router, Response } from "express";
import multer from "multer";
import Papa from "papaparse";
import { prisma } from "@shinaa/database";
import { TimetableRowSchema, CreateEventSchema } from "@shinaa/shared-types";
import { authenticateJWT, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication to all administrative routes
router.use(authenticateJWT);
router.use(requireRole(["official"]));

const dayMap: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

// POST /api/schedules/upload-csv - Bulk upload recurring class schedules via CSV
router.post("/upload-csv", upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "CSV file is required" });
  }

  try {
    const csvString = req.file.buffer.toString("utf8");
    const parsed = Papa.parse<any>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    const errors: Array<{ row: number; errors: Record<string, string[]> }> = [];
    const validatedSchedules: Array<{
      roomId: string;
      title: string;
      scheduleType: "recurring_class";
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }> = [];

    // Cache room IDs to avoid duplicate queries
    const roomCache: Record<string, string> = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1; // 1-indexed for readability

      // Map headers to Zod-friendly format
      const normalizedDay = row.day_of_week?.trim().toLowerCase();
      const mappedDay = dayMap[normalizedDay];

      const mappedRow = {
        roomName: row.room_name?.trim(),
        title: row.title?.trim(),
        scheduleType: "recurring_class",
        dayOfWeek: mappedDay,
        startTime: row.start_time?.trim(),
        endTime: row.end_time?.trim(),
      };

      const validation = TimetableRowSchema.safeParse(mappedRow);
      if (!validation.success) {
        errors.push({
          row: rowIndex,
          errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
        });
        continue;
      }

      const validatedData = validation.data;

      // Look up room name
      let roomId = roomCache[validatedData.roomName];
      if (!roomId) {
        const room = await prisma.room.findUnique({
          where: { name: validatedData.roomName },
        });
        if (!room) {
          errors.push({
            row: rowIndex,
            errors: { roomName: [`Room '${validatedData.roomName}' does not exist in the database`] },
          });
          continue;
        }
        roomId = room.id;
        roomCache[validatedData.roomName] = room.id;
      }

      validatedSchedules.push({
        roomId,
        title: validatedData.title,
        scheduleType: "recurring_class",
        dayOfWeek: validatedData.dayOfWeek!, // safe because scheduleType is verified
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Validation failed for some rows",
        details: errors,
      });
    }

    // Write schedules to the database in a transaction
    if (validatedSchedules.length > 0) {
      await prisma.$transaction(
        validatedSchedules.map((schedule) =>
          prisma.schedule.create({
            data: schedule,
          })
        )
      );
    }

    return res.json({
      message: `Successfully uploaded ${validatedSchedules.length} schedules.`,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return res.status(500).json({ error: "An error occurred while parsing the CSV file" });
  }
});

// POST /api/schedules/event - Book a single one-time event
router.post("/event", async (req: AuthenticatedRequest, res: Response) => {
  const validation = CreateEventSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten().fieldErrors });
  }

  const { roomId, title, specificDate, startTime, endTime } = validation.data;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const event = await prisma.schedule.create({
      data: {
        roomId,
        title,
        scheduleType: "one_time_event",
        specificDate: new Date(specificDate),
        startTime,
        endTime,
      },
    });

    return res.json({
      message: "One-time event logged successfully",
      event,
    });
  } catch (error) {
    console.error("Event logger error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
