\pset pager off
\echo ==== tables having a merchant_id column ====
SELECT table_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='merchant_id' ORDER BY table_name;

\echo ==== receiving-method / api-key tables ====
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND (table_name ~ 'receiv|method|api_key|merchant_key|secret')
ORDER BY table_name;
