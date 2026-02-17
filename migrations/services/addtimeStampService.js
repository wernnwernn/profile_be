const DEFAULT_PRECISION = 3; // DATETIME(3) millisecond

const q = (name) => `\`${String(name).replace(/`/g, "``")}\``;

const dropTriggerIfExists = async (knex, triggerName) => {
  await knex.raw(`DROP TRIGGER IF EXISTS ${q(triggerName)};`);
};

const createUpdatedAtTrigger = async (knex, tableName, updatedCol, triggerName) => {
  await knex.raw(`
    CREATE TRIGGER ${q(triggerName)}
    BEFORE UPDATE ON ${q(tableName)}
    FOR EACH ROW
    BEGIN
      SET NEW.${q(updatedCol)} = CURRENT_TIMESTAMP(3);
    END;
  `);
};

const addColumnIfMissing = async (knex, tableName, colName, colTypeSql, defaultSql) => {
  const has = await knex.schema.hasColumn(tableName, colName);
  if (has) return;

  await knex.raw(`
    ALTER TABLE ${q(tableName)}
    ADD COLUMN ${q(colName)} ${colTypeSql}
    NOT NULL
    DEFAULT ${defaultSql};
  `);
};

const ensureDefaultIfNull = async (knex, tableName, colName, defaultSql) => {
  await knex.raw(`
    UPDATE ${q(tableName)}
    SET ${q(colName)} = ${defaultSql}
    WHERE ${q(colName)} IS NULL;
  `);

  await knex.raw(`
    ALTER TABLE ${q(tableName)}
    MODIFY COLUMN ${q(colName)} DATETIME(${DEFAULT_PRECISION})
    NOT NULL
    DEFAULT ${defaultSql};
  `);
};

exports.addTimestamps = async function addTimestamps(knex, tableName, opts = {}) {
  const {
    createdCol = "created_at",
    updatedCol = "updated_at",
    precision = DEFAULT_PRECISION,
    useUtc = false,
    triggerPrefix = "trg_UpdateDate",
  } = opts;

  const defaultSql = useUtc ? "UTC_TIMESTAMP(3)" : "CURRENT_TIMESTAMP(3)";
  const typeSql = `DATETIME(${precision})`;

  await addColumnIfMissing(knex, tableName, createdCol, typeSql, defaultSql);
  await addColumnIfMissing(knex, tableName, updatedCol, typeSql, defaultSql);

  await ensureDefaultIfNull(knex, tableName, createdCol, defaultSql);
  await ensureDefaultIfNull(knex, tableName, updatedCol, defaultSql);

  const triggerName = `${triggerPrefix}_${tableName}`;
  await dropTriggerIfExists(knex, triggerName);
  await createUpdatedAtTrigger(knex, tableName, updatedCol, triggerName);

  return { triggerName };
};
