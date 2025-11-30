// === REUSABLE ROLL NUMBER VALIDATION MIDDLEWARE ===
const validateRollFormat = (allowedYears = ['24', '25'], allowedBranches = ['1']) => {
  return (req, res, next) => {
    let roll = req.body?.roll_number?.trim();

    if (!roll) {
      return res.status(400).send('Roll number is required.');
    }

    // Normalize: uppercase for consistency
    const normalizedRoll = roll.toUpperCase();

    // Build dynamic regex
    const yearPart = allowedYears.join('');
    const branchPart = allowedBranches.map(b => b.padStart(1, '0')).join(''); // e.g., "1" → "1"
    const regex = new RegExp(`^2[${yearPart}]VD[${branchPart}]A05[0-7][0-9]$`);

    if (!regex.test(normalizedRoll)) {
      return res.status(400).send(`
        <div style="text-align:center;margin-top:50px;font-family:Arial,sans-serif;">
          <h2>Invalid Roll Number</h2>
          <p><strong>Expected Format Examples:</strong></p>
          <ul style="display:inline-block;text-align:left;">
            ${allowedYears.includes('24') ? '<li>24VD1A0501 to 24VD1A0570</li>' : ''}
            ${allowedYears.includes('25') ? '<li>25VD1A0501 to 25VD1A0570</li>' : ''}
          </ul>
          <p style="margin-top:15px;">
            Year: <strong>2${allowedYears.join(' or 2')}</strong> | 
            Branch: <strong>VD${allowedBranches.join(' or VD')}</strong> | 
            Last two digits: <strong>00–69</strong>
          </p>
          <a href="/" style="color:#0066cc;">← Go Back</a>
        </div>
      `);
    }

    // Attach both versions if needed
    req.validatedRoll = {
      original: roll,
      normalized: normalizedRoll  // e.g., "24VD1A0561"
    };

    next();
  };
};

module.exports = validateRollFormat;