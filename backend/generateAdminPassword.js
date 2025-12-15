// Script to generate bcrypt hash for admin password
// Run: node generateAdminPassword.js

import bcrypt from 'bcryptjs';

const password = '123456';
const hash = await bcrypt.hash(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nCopy this hash to the ADMIN_TABLE_SETUP.sql file');

