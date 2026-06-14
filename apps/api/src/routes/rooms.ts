import { Router, Request, Response } from "express";
import { prisma } from "@shinaa/database";
import { AvailabilityQuerySchema, AvailabilityQueryInput } from "@shinaa/shared-types";

const router = Router();

// GET /api/rooms/availability - Public availability search
router.get("/availability", async (req: Request, res: Response) => {
  // 1. Establish defaults if query params are missing
  const now = new Date();
  
  // Format current date as YYYY-MM-DD
  const defaultDate = now.toISOString().split("T")[0];
  
  // Format current time as HH:MM
  const startH = String(now.getHours()).padStart(2, "0");
  const startM = String(now.getMinutes()).padStart(2, "0");
  const defaultStartTime = `${startH}:${startM}`;
  
  // Default end time is start time + 1 hour (wrapped at 24)
  const endH = String((now.getHours() + 1) % 24).padStart(2, "0");
  const defaultEndTime = `${endH}:${startM}`;

  const queryParams = {
    date: req.query.date as string || defaultDate,
    startTime: req.query.startTime as string || defaultStartTime,
    endTime: req.query.endTime as string || defaultEndTime,
  };

  // 2. Validate query params using the shared Zod schema
  const validation = AvailabilityQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.flatten().fieldErrors });
  }

  const { date, startTime, endTime } = validation.data as Required<AvailabilityQueryInput>;

  try {
    // 3. Extract the day of the week (1 = Monday, 7 = Sunday)
    // We parse in UTC or local depending on date string. A date string like YYYY-MM-DD 
    // parsed directly as `new Date("YYYY-MM-DD")` yields UTC, which can shift the day.
    // To prevent timezone shifts, we split the string and parse it as a local date.
    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    const jsDay = localDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // 4. Fetch all rooms including their keys and active schedules
    // To prevent pulling too much data, we can query only schedules that match our date/dayOfWeek criteria
    const rooms = await prisma.room.findMany({
      include: {
        keys: {
          select: {
            id: true,
            isAvailable: true,
            lastUpdated: true,
          },
        },
        schedules: {
          where: {
            OR: [
              {
                scheduleType: "recurring_class",
                dayOfWeek: dayOfWeek,
              },
              {
                scheduleType: "one_time_event",
                specificDate: localDate,
              },
            ],
          },
        },
      },
    });

    // 5. Evaluate availability and conflict prediction for each room
    const result = rooms.map((room) => {
      const roomKey = room.keys[0] || null;
      
      // Check for time intersections among the room's schedules for this day
      // Conflict formula: Requested_Start_Time < Existing_End_Time AND Requested_End_Time > Existing_Start_Time
      const conflictSchedule = room.schedules.find((schedule) => {
        return startTime < schedule.endTime && endTime > schedule.startTime;
      });

      const isOccupied = !!conflictSchedule;

      return {
        id: room.id,
        name: room.name,
        roomType: room.roomType,
        key: roomKey ? {
          id: roomKey.id,
          isAvailable: roomKey.isAvailable,
          lastUpdated: roomKey.lastUpdated,
        } : null,
        isKeyAvailable: roomKey ? roomKey.isAvailable : false,
        prediction: {
          status: isOccupied ? "Occupied" : "Vacant",
          reason: conflictSchedule ? conflictSchedule.title : null,
          scheduleType: conflictSchedule ? conflictSchedule.scheduleType : null,
          queriedSlot: {
            date,
            startTime,
            endTime,
          },
        },
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Availability prediction query error:", error);
    return res.status(500).json({ error: "An internal server error occurred" });
  }
});

export default router;
