-- CreateTable
CREATE TABLE "Process" (
    "id" SERIAL NOT NULL,
    "cnj" TEXT NOT NULL,
    "forum" TEXT NOT NULL,
    "court" TEXT NOT NULL,
    "lawsuitValue" DECIMAL(65,30) NOT NULL,
    "numberOfAuthors" INTEGER NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "movementDate" DATE NOT NULL,
    "movementTitle" TEXT NOT NULL,
    "movementContent" TEXT,
    "sourceOrder" INTEGER NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Process_cnj_key" ON "Process"("cnj");

-- CreateIndex
CREATE INDEX "Movement_processId_movementDate_sourceOrder_idx" ON "Movement"("processId", "movementDate", "sourceOrder");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
