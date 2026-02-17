// Example: node genHash.js "P@ssw0rd!" 10

const bcrypt = require("bcryptjs");

(async () => {
  try {
    const password = process.argv[2];
    const roundsArg = process.argv[3];

    if (!password) {
      console.log('Usage: node genHash.js "YourPassword123!" [rounds]');
      process.exit(1);
    }

    const rounds = Number(roundsArg || 10);
    if (!Number.isFinite(rounds) || rounds < 4 || rounds > 15) {
      console.error("Invalid rounds. Please use a number between 4 and 15 (recommended: 10).");
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(rounds);
    const hash = await bcrypt.hash(password, salt);

    console.log(hash);
  } catch (err) {
    console.error("Error generating hash:", err);
    process.exit(1);
  }
})();
