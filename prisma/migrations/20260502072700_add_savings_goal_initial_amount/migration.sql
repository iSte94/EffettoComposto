-- Add `initialAmount` to SavingsGoal: capitale di partenza al momento della
-- creazione del goal. Necessario per calcolare correttamente il "ritmo storico"
-- come (currentAmount - initialAmount) / mesi_trascorsi. Senza questo campo,
-- la pace sovrastimava sistematicamente il risparmio mensile per i goal creati
-- con un capitale di partenza > 0.
--
-- Default 0 garantisce backward compatibility: per i goal storici (che non
-- avevano questo campo) la formula degenera all'esistente `currentAmount /
-- mesi`, lasciando invariato il loro comportamento.
ALTER TABLE "SavingsGoal" ADD COLUMN "initialAmount" REAL NOT NULL DEFAULT 0;
