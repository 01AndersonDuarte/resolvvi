-- CreateEnum
CREATE TYPE "SummaryAttemptStatus" AS ENUM ('running', 'succeeded', 'failed', 'expired', 'source_changed', 'rules_changed');

-- CreateTable
CREATE TABLE "SummarySourceState" (
    "processId" INTEGER NOT NULL,
    "sourceHash" CHAR(64) NOT NULL,
    "sourceRevision" INTEGER NOT NULL DEFAULT 1,
    "lastSummaryVersion" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SummarySourceState_pkey" PRIMARY KEY ("processId")
);

-- CreateTable
CREATE TABLE "SummaryGenerationSlot" (
    "id" UUID NOT NULL,
    "processId" INTEGER NOT NULL,
    "sourceRevision" INTEGER NOT NULL,
    "rulesVersion" VARCHAR(100) NOT NULL,
    "sourceHash" CHAR(64) NOT NULL,
    "sourceFormatVersion" VARCHAR(50) NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "movementCount" INTEGER NOT NULL,
    "lastAttemptNumber" INTEGER NOT NULL DEFAULT 0,
    "retryAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SummaryGenerationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummaryAttempt" (
    "id" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "SummaryAttemptStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "deadlineAt" TIMESTAMPTZ(3) NOT NULL,
    "callStartedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "failureCode" VARCHAR(100),
    "configuration" JSONB NOT NULL,
    "configurationHash" CHAR(64) NOT NULL,
    "inputUnits" INTEGER,
    "outputUnits" INTEGER,
    "totalUnits" INTEGER,
    "providerRequestId" VARCHAR(255),

    CONSTRAINT "SummaryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessAiSummary" (
    "id" UUID NOT NULL,
    "processId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "slotId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "paragraphs" JSONB NOT NULL,
    "claims" JSONB NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProcessAiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummaryFeedbackRecord" (
    "summaryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SummaryFeedbackRecord_pkey" PRIMARY KEY ("summaryId","userId")
);

-- CreateIndex
CREATE INDEX "SummaryGenerationSlot_processId_sourceRevision_idx" ON "SummaryGenerationSlot"("processId", "sourceRevision");

-- CreateIndex
CREATE UNIQUE INDEX "SummaryGenerationSlot_processId_sourceRevision_rulesVersion_key" ON "SummaryGenerationSlot"("processId", "sourceRevision", "rulesVersion");

-- CreateIndex
CREATE INDEX "SummaryAttempt_status_deadlineAt_idx" ON "SummaryAttempt"("status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "SummaryAttempt_slotId_number_key" ON "SummaryAttempt"("slotId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessAiSummary_slotId_key" ON "ProcessAiSummary"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessAiSummary_attemptId_key" ON "ProcessAiSummary"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessAiSummary_processId_version_key" ON "ProcessAiSummary"("processId", "version");

-- CreateIndex
CREATE INDEX "SummaryFeedbackRecord_userId_idx" ON "SummaryFeedbackRecord"("userId");

-- AddForeignKey
ALTER TABLE "SummarySourceState" ADD CONSTRAINT "SummarySourceState_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryGenerationSlot" ADD CONSTRAINT "SummaryGenerationSlot_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryAttempt" ADD CONSTRAINT "SummaryAttempt_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SummaryGenerationSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAiSummary" ADD CONSTRAINT "ProcessAiSummary_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAiSummary" ADD CONSTRAINT "ProcessAiSummary_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SummaryGenerationSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAiSummary" ADD CONSTRAINT "ProcessAiSummary_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SummaryAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryFeedbackRecord" ADD CONSTRAINT "SummaryFeedbackRecord_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "ProcessAiSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryFeedbackRecord" ADD CONSTRAINT "SummaryFeedbackRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
