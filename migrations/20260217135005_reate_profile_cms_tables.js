const { addTimestamps } = require("./services/addtimeStampService");

const dropTimestampTrigger = async (knex, tableName) => {
  await knex.raw(`DROP TRIGGER IF EXISTS \`trg_UpdateDate_${tableName}\`;`);
};

exports.up = async function up(knex) {
  await knex.schema.createTable("users", (t) => {
    t.increments("id").primary();

    t.string("email", 191).notNullable().unique();
    t.string("password_hash", 255).notNullable();

    t.string("display_name", 191).nullable();
    t.enum("role", ["admin", "user"]).notNullable().defaultTo("user");
    t.boolean("is_active").notNullable().defaultTo(true);

    t.dateTime("last_login_at").nullable();
  });
  await addTimestamps(knex, "users", { useUtc: true });

  await knex.schema.createTable("media", (t) => {
    t.increments("id").primary();

    t.specificType("data", "LONGBLOB").notNullable();

    t.string("original_name", 255).notNullable();
    t.string("mime_type", 100).notNullable();
    t.bigInteger("size_bytes").notNullable();

    t.integer("width").nullable();
    t.integer("height").nullable();
    t.string("alt_text", 255).nullable();

    t.index(["mime_type"]);
  });
  await addTimestamps(knex, "media", { useUtc: true });

  await knex.schema.createTable("profiles", (t) => {
    t.increments("id").primary();

    t
      .integer("user_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("slug", 191).notNullable().unique();

    t.string("display_name", 191).notNullable();
    t.string("headline", 255).nullable();

    t.text("about_md", "longtext").nullable();

    t.string("email_public", 191).nullable();
    t.string("phone_public", 50).nullable();
    t.string("location", 191).nullable();

    t
      .integer("avatar_media_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("media")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    t
      .integer("resume_media_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("media")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    t.boolean("is_published").notNullable().defaultTo(false);

    t.index(["user_id"]);
    t.index(["is_published"]);
  });
  await addTimestamps(knex, "profiles", { useUtc: true });

  await knex.schema.createTable("profile_links", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("platform", 50).notNullable();
    t.string("label", 100).nullable();
    t.string("url", 500).notNullable();

    t.integer("sort_order").notNullable().defaultTo(0);
    t.boolean("is_active").notNullable().defaultTo(true);

    t.index(["profile_id", "sort_order"]);
    t.index(["profile_id", "platform"]);
  });
  await addTimestamps(knex, "profile_links", { useUtc: true });

  await knex.schema.createTable("skills", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("name", 100).notNullable();
    t.string("category", 50).nullable();
    t.integer("level").nullable();

    t.integer("sort_order").notNullable().defaultTo(0);
    t.boolean("is_active").notNullable().defaultTo(true);

    t.index(["profile_id", "category"]);
    t.index(["profile_id", "sort_order"]);
  });
  await addTimestamps(knex, "skills", { useUtc: true });

  await knex.schema.createTable("experiences", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("company_name", 191).notNullable();
    t.string("title", 191).notNullable();
    t.string("employment_type", 50).nullable();
    t.string("location", 191).nullable();

    t.date("start_date").notNullable();
    t.date("end_date").nullable();
    t.boolean("is_current").notNullable().defaultTo(false);

    t.text("description_md", "longtext").nullable();

    t.integer("sort_order").notNullable().defaultTo(0);

    t.index(["profile_id", "sort_order"]);
    t.index(["profile_id", "start_date"]);
  });
  await addTimestamps(knex, "experiences", { useUtc: true });

  await knex.schema.createTable("experience_highlights", (t) => {
    t.increments("id").primary();

    t
      .integer("experience_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("experiences")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.text("text", "longtext").notNullable();
    t.integer("sort_order").notNullable().defaultTo(0);

    t.index(["experience_id", "sort_order"]);
  });
  await addTimestamps(knex, "experience_highlights", { useUtc: true });

  await knex.schema.createTable("educations", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("school", 191).notNullable();
    t.string("degree", 191).nullable();
    t.string("field", 191).nullable();

    t.date("start_date").nullable();
    t.date("end_date").nullable();

    t.text("description_md", "longtext").nullable();

    t.integer("sort_order").notNullable().defaultTo(0);

    t.index(["profile_id", "sort_order"]);
  });
  await addTimestamps(knex, "educations", { useUtc: true });

  await knex.schema.createTable("certificates", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("name", 191).notNullable();
    t.string("issuer", 191).nullable();
    t.date("issue_date").nullable();
    t.string("credential_url", 500).nullable();

    t
      .integer("media_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("media")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    t.integer("sort_order").notNullable().defaultTo(0);

    t.index(["profile_id", "sort_order"]);
  });
  await addTimestamps(knex, "certificates", { useUtc: true });

  await knex.schema.createTable("projects", (t) => {
    t.increments("id").primary();

    t
      .integer("profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("slug", 191).notNullable(); // unique ต่อ profile
    t.string("title", 191).notNullable();
    t.string("summary", 255).nullable();
    t.text("description_md", "longtext").nullable();

    t.string("role", 191).nullable();

    t.json("tech_stack_json").nullable();

    t.date("start_date").nullable();
    t.date("end_date").nullable();

    t.enum("status", ["active", "completed", "draft"]).notNullable().defaultTo("draft");

    t.boolean("is_featured").notNullable().defaultTo(false);
    t.integer("sort_order").notNullable().defaultTo(0);

    t
      .integer("cover_media_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("media")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    t.string("demo_url", 500).nullable();
    t.string("repo_url", 500).nullable();

    t.unique(["profile_id", "slug"]);
    t.index(["profile_id", "sort_order"]);
    t.index(["profile_id", "is_featured"]);
  });
  await addTimestamps(knex, "projects", { useUtc: true });

  await knex.schema.createTable("project_media", (t) => {
    t.increments("id").primary();

    t
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t
      .integer("media_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("media")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.string("caption", 255).nullable();
    t.integer("sort_order").notNullable().defaultTo(0);

    t.index(["project_id", "sort_order"]);
  });
  await addTimestamps(knex, "project_media", { useUtc: true });

  await knex.schema.createTable("tags", (t) => {
    t.increments("id").primary();
    t.string("name", 100).notNullable().unique();
    t.string("slug", 120).notNullable().unique();
  });
  await addTimestamps(knex, "tags", { useUtc: true });

  await knex.schema.createTable("project_tags", (t) => {
    t
      .integer("project_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("projects")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t
      .integer("tag_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("tags")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    t.primary(["project_id", "tag_id"]);
    t.index(["tag_id"]);
  });
  await addTimestamps(knex, "project_tags", { useUtc: true });

  await knex.schema.createTable("audit_logs", (t) => {
    t.increments("id").primary();

    t
      .integer("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    t.string("action", 50).notNullable();
    t.string("entity", 100).notNullable();
    t.integer("entity_id").unsigned().nullable();

    t.json("before_json").nullable();
    t.json("after_json").nullable();

    t.string("ip", 50).nullable();
    t.string("user_agent", 255).nullable();
    t.string("request_id", 100).nullable();

    t.index(["user_id"]);
    t.index(["entity", "entity_id"]);
  });
  await addTimestamps(knex, "audit_logs", { useUtc: true });
};

exports.down = async function down(knex) {
  const tables = [
    "audit_logs",
    "project_tags",
    "tags",
    "project_media",
    "projects",
    "certificates",
    "educations",
    "experience_highlights",
    "experiences",
    "skills",
    "profile_links",
    "profiles",
    "media",
    "users",
  ];

  for (const tb of tables) {
    await dropTimestampTrigger(knex, tb);
  }

  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("project_tags");
  await knex.schema.dropTableIfExists("tags");
  await knex.schema.dropTableIfExists("project_media");
  await knex.schema.dropTableIfExists("projects");
  await knex.schema.dropTableIfExists("certificates");
  await knex.schema.dropTableIfExists("educations");
  await knex.schema.dropTableIfExists("experience_highlights");
  await knex.schema.dropTableIfExists("experiences");
  await knex.schema.dropTableIfExists("skills");
  await knex.schema.dropTableIfExists("profile_links");
  await knex.schema.dropTableIfExists("profiles");
  await knex.schema.dropTableIfExists("media");
  await knex.schema.dropTableIfExists("users");
};
