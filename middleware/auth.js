// === ROLL NUMBER VALIDATION MIDDLEWARE ===
const validateRollFormat = (req, res, next) => {
  const roll = (req.body?.roll_number || req.session?.roll);

  if (!roll) {
    return res.status(400).send('Roll number is required.');
  }
roll = roll.toLower().trim();
  // Regex: 2[45]vd1a05[0-6][0-9]
  const rollRegex = /^2[45]vd1a05[0-6][0-9]$/;
  
  if (!rollRegex.test(roll)) {
    return res.status(400).send(`
      <div style="text-align:center;margin-top:50px;font-family:Arial;">
        <h2>Invalid Roll Number</h2>
        <p><strong>Format:</strong> 2<strong>4</strong>vd1a05<strong>61</strong></p>
        <p>First digit after 2: <strong>4 or 5</strong><br>
           Last two digits: <strong>00–69</strong></p>
        <a href="/">← Go Back</a>
      </div>
    `);
  }

  // Attach cleaned roll to request
  req.validatedRoll = roll;
  next();
};

module.exports = {
    validateRollFormat,
}