/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table("profiles", function (table) {
        table.json("show_content").defaultTo({
            hero: true,
            about: true,
            experience: true,
            projects: true,
            skills: true,
            education: true,
            certificates: true,
            contact: true
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table("profiles", function (table) {
        table.dropColumn("show_content");
    });
};
