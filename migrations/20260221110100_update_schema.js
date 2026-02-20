exports.up = async function (knex) {
    // 1. Rename users.display_name to users.username
    await knex.schema.alterTable("users", (t) => {
        t.renameColumn("display_name", "username");
    });

    // Since it might not be unique initially, let's just make sure we alter it or we could add unique constraint
    await knex.schema.alterTable("users", (t) => {
        t.string("username", 191).unique().alter();
    });

    // 2. Add profiles.github_public
    await knex.schema.alterTable("profiles", (t) => {
        t.string("github_public", 500).nullable();
    });

    // 3. Remove skills.level
    await knex.schema.alterTable("skills", (t) => {
        t.dropColumn("level");
    });

    // 4. Remove experiences.employment_type
    await knex.schema.alterTable("experiences", (t) => {
        t.dropColumn("employment_type");
    });

    // 5. Add media.user_id
    await knex.schema.alterTable("media", (t) => {
        t.integer("user_id")
            .unsigned()
            .nullable()
            .references("id")
            .inTable("users")
            .onDelete("SET NULL")
            .onUpdate("CASCADE");
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable("media", (t) => {
        t.dropForeign(["user_id"]);
        t.dropColumn("user_id");
    });

    await knex.schema.alterTable("experiences", (t) => {
        t.string("employment_type", 50).nullable();
    });

    await knex.schema.alterTable("skills", (t) => {
        t.integer("level").nullable();
    });

    await knex.schema.alterTable("profiles", (t) => {
        t.dropColumn("github_public");
    });

    await knex.schema.alterTable("users", (t) => {
        t.dropUnique(["username"]);
        t.renameColumn("username", "display_name");
    });
};
