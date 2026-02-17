/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  await knex.raw(`DELETE FROM example;`);

  await knex.raw(`
    INSERT INTO example (name, note, is_active)
    VALUES
      ('alpha', 'seed row 1', 1),
      ('beta',  'seed row 2', 1),
      ('gamma', 'seed row 3', 0);
  `);
};
