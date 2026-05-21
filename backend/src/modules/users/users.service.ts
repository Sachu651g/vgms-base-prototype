import {
  Injectable, NotFoundException,
  ConflictException, Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../../db/db.service';
import { users } from '../../../../db/schema/index';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Strip passwordHash before returning user data
function sanitize(u: Record<string, unknown>) {
  const { passwordHash, ...safe } = u as any;
  void passwordHash;
  return safe;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private dbService: DbService) {}

  async findAll(params: {
    page?: number; limit?: number;
    search?: string; role?: string;
  }) {
    const page   = Math.max(1, params.page  ?? 1);
    const limit  = Math.min(100, Math.max(1, params.limit ?? 10));
    const offset = (page - 1) * limit;

    let result = await this.dbService.db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset);

    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
      );
    }
    if (params.role) {
      result = result.filter(u => u.role === params.role);
    }

    return {
      data: result.map(sanitize),
      meta: { page, limit, total: result.length },
    };
  }

  async findOne(id: string) {
    const result = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return sanitize(result[0] as any);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length) {
      throw new ConflictException(
        `A user with email ${dto.email} already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const inserted = await this.dbService.db.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as any,
      phone: dto.phone,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      isActive: true,
      failedLoginAttempts: 0,
    }).returning();

    this.logger.log(`Created user ${inserted[0].email} (${inserted[0].role})`);
    return sanitize(inserted[0] as any);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const clash = await this.dbService.db
        .select()
        .from(users)
        .where(eq(users.email, dto.email))
        .limit(1);
      if (clash.length && clash[0].id !== id) {
        throw new ConflictException(
          `Email ${dto.email} is already taken by another user`,
        );
      }
    }

    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name         !== undefined) setValues.name         = dto.name;
    if (dto.email        !== undefined) setValues.email        = dto.email;
    if (dto.role         !== undefined) setValues.role         = dto.role;
    if (dto.phone        !== undefined) setValues.phone        = dto.phone;
    if (dto.branchId     !== undefined) setValues.branchId     = dto.branchId;
    if (dto.departmentId !== undefined) setValues.departmentId = dto.departmentId;
    if (dto.isActive     !== undefined) setValues.isActive     = dto.isActive;

    const updated = await this.dbService.db
      .update(users)
      .set(setValues as any)
      .where(eq(users.id, id))
      .returning();

    this.logger.log(`Updated user ${id}`);
    return sanitize(updated[0] as any);
  }

  async remove(id: string) {
    const user = await this.findOne(id) as any;
    await this.dbService.db.delete(users).where(eq(users.id, id));
    this.logger.log(`Deleted user ${id} (${user.email})`);
    return { message: `User ${user.email} deleted successfully`, id };
  }
}
