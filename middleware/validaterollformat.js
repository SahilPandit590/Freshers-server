// === REUSABLE ROLL NUMBER VALIDATION MIDDLEWARE ===
// This is a FACTORY function → it returns a customized middleware

const validateRollFormat = (allowedYears = ['24', '25'], allowedBranches = ['1','5']) => {
  return (req, res, next) => {
    // 1. Get roll number from body (or session if you ever need it)
    let roll = (req.body?.roll_number || '').trim();

    if (!roll) {
      return res.status(400).send(`
        <div style="text-align:center;margin-top:100px;font-family:Arial,sans-serif;">
          <h2>Missing Roll Number</h2>
          <p>Please enter your roll number.</p>
          <a href="/" style="color:#0066cc;">← Go Back</a>
        </div>
      `);
    }

    // 2. Normalize to uppercase (so user can type vd, VD, Vd, etc.)
    const normalizedRoll = roll.toUpperCase();

    // 3. Build the correct regex dynamically
    // Example: allowedYears = ['24','25'] → [24] or [25]
    //          allowedBranches = ['1','5'] → [15]
    const yearRegexPart  = allowedYears.join('');   // "2425" → [24] means 24 or 25
    const branchRegexPart = allowedBranches.join(''); // "15"  → [15] means branch 1 or 5

    const regex = new RegExp(`^2[${yearRegexPart}]VD[${branchRegexPart}]A05[0-7][0-9]$`);

    // 4. Test if roll matches the allowed pattern
    if (!regex.test(normalizedRoll)) {
      // Show user-friendly error with exact allowed formats
      const examples = [];
      if (allowedYears.includes('24')) examples.push('24VD1A0501 – 24VD1A0569');
      if (allowedYears.includes('25')) examples.push('25VD1A0501 – 25VD1A0569');

      return res.status(400).send(`
        <div style="text-align:center;margin-top:80px;font-family:Arial,sans-serif;">
          <h2 style="color:#d32f2f;">Invalid Roll Number</h2>
          <p><strong>Allowed formats:</strong></p>
          <ul style="display:inline-block;text-align:left;margin:10px;">
            ${examples.map(ex => `<li>${ex}</li>`).join('')}
          </ul>
          <p style="margin-top:20px;">
            Year must start with: <strong>2${allowedYears.join(' or 2')}</strong><br>
            Branch must be: <strong>VD${allowedBranches.join(' or VD')}</strong><br>
            Last two digits: <strong>00 to 69</strong>
          </p>
          <a href="/" style="color:#0066cc;font-size:18px;">← Try Again</a>
        </div>
      `);
    }

    // 5. Success → attach clean roll number to request
    req.validatedRoll = normalizedRoll; // e.g., "24VD1A0561"

    // Optional: also extract year/branch if needed later
    req.batchYear = normalizedRoll.substring(0, 4); // "24VD" → "24VD" or just "24"
    req.branch    = normalizedRoll.substring(6, 7); // position of branch digit

    next(); // continue to route handler
  };
};

module.exports = validateRollFormat;