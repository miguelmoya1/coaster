SELECT migration_name, finished_at IS NOT NULL, rolled_back_at IS NOT NULL
FROM "_prisma_migrations"
