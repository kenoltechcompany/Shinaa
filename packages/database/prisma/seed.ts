import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.keyLog.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.key.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.staffUser.deleteMany({});

  console.log("Seeding staff users...");
  const saltRounds = 10;
  const officialPasswordHash = await bcrypt.hash("official123", saltRounds);
  const caretakerPasswordHash = await bcrypt.hash("caretaker123", saltRounds);

  const official = await prisma.staffUser.create({
    data: {
      name: "Admin Official",
      email: "official@shinaa.edu",
      passwordHash: officialPasswordHash,
      role: "official",
    },
  });

  const caretaker = await prisma.staffUser.create({
    data: {
      name: "John Caretaker",
      email: "caretaker@shinaa.edu",
      passwordHash: caretakerPasswordHash,
      role: "caretaker",
    },
  });

  console.log(`Created staff: ${official.email} (official), ${caretaker.email} (caretaker)`);

  console.log("Seeding rooms and keys...");
  const roomData = [
    { name: "A-101", roomType: "classroom" },
    { name: "B-202", roomType: "laboratory" },
    { name: "Auditorium Max", roomType: "auditorium" },
    { name: "C-303", roomType: "classroom" },
  ];

  for (const data of roomData) {
    const room = await prisma.room.create({
      data: {
        name: data.name,
        roomType: data.roomType,
      },
    });

    const key = await prisma.key.create({
      data: {
        roomId: room.id,
        isAvailable: true,
      },
    });

    console.log(`Created Room ${room.name} with Key ID: ${key.id}`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
