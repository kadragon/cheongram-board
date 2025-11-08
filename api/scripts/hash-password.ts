/**
 * Password Hashing Script
 *
 * Generate bcrypt hash for admin password.
 * Usage: npx tsx scripts/hash-password.ts <password>
 */

import bcrypt from 'bcryptjs';

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: npx tsx scripts/hash-password.ts <password>');
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\n✅ Password hashed successfully!');
  console.log('\nBcrypt Hash:');
  console.log(hash);
  console.log('\nTo set this as your admin password:');
  console.log(`wrangler secret put ADMIN_PASSWORD`);
  console.log('Then paste the hash above when prompted.');
  console.log('');
}

main();
