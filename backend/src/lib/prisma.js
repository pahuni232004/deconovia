const { PrismaClient } = require("@prisma/client");

// In dev, Next/Render reload can create multiple clients; keep it minimal here.
const prisma = new PrismaClient();

module.exports = prisma;

