const prisma = require('./prismaClient'); // Correct import

// Store in-memory state for running wheels
const engines = new Map();

/**
 * Schedule automatic start if a wheel doesn't fill in time
 */
function scheduleAutoStart(io, wheelId, delayMs = 3 * 60 * 1000) {
  const startTimer = setTimeout(async () => {
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { joins: true },
    });
    if (!wheel) return;
    if (wheel.status !== 'PENDING') return;

    if (wheel.joins.length < 3) {
      // Abort & refund if not enough players
      await abortAndRefund(wheelId);
      io.emit('wheel:aborted', { wheelId });
      return;
    }

    // Start the wheel
    await prisma.wheel.update({
      where: { id: wheelId },
      data: { status: 'RUNNING', startsAt: new Date() },
    });
    io.emit('wheel:started', { wheelId });

    // Begin elimination phase
    startElimination(io, wheelId);
  }, delayMs);

  engines.set(wheelId, { startTimer });
}

/**
 * Abort and refund all players
 */
async function abortAndRefund(wheelId) {
  const wheel = await prisma.wheel.findUnique({
    where: { id: wheelId },
    include: { joins: true },
  });
  if (!wheel) return;

  const entryFee = wheel.entryFee;

  await prisma.$transaction(async (tx) => {
    for (const join of wheel.joins) {
      await tx.user.update({
        where: { id: join.userId },
        data: { coins: { increment: entryFee } },
      });

      await tx.transaction.create({
        data: {
          userId: join.userId,
          amount: entryFee,
          kind: 'refund',
          meta: `wheel:${wheelId}`,
        },
      });
    }

    await tx.wheel.update({
      where: { id: wheelId },
      data: { status: 'ABORTED' },
    });
  });
}

/**
 * Starts elimination process
 */
function startElimination(io, wheelId) {
  const state = engines.get(wheelId) || {};
  const eliminationTimer = setInterval(async () => {
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { joins: true },
    });
    if (!wheel || wheel.status !== 'RUNNING') {
      clearTimers(wheelId);
      return;
    }

    const players = wheel.joins.map((j) => j.userId);
    if (players.length <= 1) {
      // Declare winner
      const winner = players[0];
      await prisma.wheel.update({
        where: { id: wheelId },
        data: { status: 'FINISHED', winnerId: winner, finishedAt: new Date() },
      });

      io.emit('wheel:finished', { wheelId, winner });
      clearTimers(wheelId);
      return;
    }

    // Randomly eliminate one player
    const eliminated = players[Math.floor(Math.random() * players.length)];
    await prisma.join.deleteMany({
      where: { wheelId, userId: eliminated },
    });

    io.emit('wheel:eliminated', { wheelId, eliminated });
  }, 5000); // eliminate every 5 seconds for demo

  engines.set(wheelId, { ...state, eliminationTimer });
}

/**
 * Clear timers after wheel completes or aborts
 */
function clearTimers(wheelId) {
  const engine = engines.get(wheelId);
  if (!engine) return;

  if (engine.startTimer) clearTimeout(engine.startTimer);
  if (engine.eliminationTimer) clearInterval(engine.eliminationTimer);

  engines.delete(wheelId);
}

module.exports = {
  scheduleAutoStart,
  startElimination,
  abortAndRefund,
  clearTimers,
};
