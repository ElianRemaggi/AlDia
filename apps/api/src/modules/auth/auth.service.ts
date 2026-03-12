import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../../config/data-source';
import { config } from '../../config';
import { User } from './entities/user.entity';
import { AppError } from '../../shared/middleware';
import { LoginDto, RegisterDto } from './auth.dto';

const userRepo = () => AppDataSource.getRepository(User);

function generateAccessToken(user: User): string {
  const options: SignOptions = { expiresIn: config.jwt.accessExpiry as unknown as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: user.id, role: user.role, commerceId: user.commerceId },
    config.jwt.secret,
    options,
  );
}

function generateRefreshToken(user: User): string {
  const options: SignOptions = { expiresIn: config.jwt.refreshExpiry as unknown as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    config.jwt.secret,
    options,
  );
}

export async function login(dto: LoginDto) {
  const user = await userRepo().findOne({ where: { email: dto.email } });
  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken, refreshToken };
}

export async function register(dto: RegisterDto) {
  const existing = await userRepo().findOne({ where: { email: dto.email } });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const user = userRepo().create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: dto.role,
    commerceId: dto.commerceId ?? null,
  });

  await userRepo().save(user);

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as {
      sub: string;
      type: string;
    };

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    const user = await userRepo().findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    const accessToken = generateAccessToken(user);
    return { accessToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

export async function getMe(userId: string) {
  const user = await userRepo().findOne({
    where: { id: userId },
    relations: ['commerce'],
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
