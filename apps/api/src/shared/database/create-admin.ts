// Creates (or resets the password of) a platform admin, for a fresh production install:
//   docker compose ... run --rm -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api node dist/shared/database/create-admin.js
// The demo seed (seed.ts) is for development only and must not run in production.
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../modules/auth/entities/user.entity';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim(); // stored as typed, like the admin UI does
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Admin';

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error(`${email} exists and is not an admin; refusing to change it`);
    }
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await users.save(existing);
    console.log(`Admin ${email} already existed: password reset and account enabled`);
  } else {
    await users.save(users.create({ name, email, passwordHash, role: 'admin', commerceId: null }));
    console.log(`Created admin ${email}`);
  }
  await AppDataSource.destroy();
}

createAdmin().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
