import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../../db/db.service';
import { visitors } from '../../../../db/schema/index';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';

@Injectable()
export class VisitorsService {
  constructor(private dbService: DbService) {}

  async findAll(page = 1, limit = 10) {
    const safePage  = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset    = (safePage - 1) * safeLimit;
    const data = await this.dbService.db
      .select()
      .from(visitors)
      .limit(safeLimit)
      .offset(offset);
    return { data, meta: { page: safePage, limit: safeLimit, total: data.length } };
  }

  async findOne(id: string) {
    const result = await this.dbService.db
      .select()
      .from(visitors)
      .where(eq(visitors.id, id))
      .limit(1);
    if (!result.length) throw new NotFoundException(`Visitor ${id} not found`);
    return result[0];
  }

  async create(dto: CreateVisitorDto) {
    const inserted = await this.dbService.db
      .insert(visitors)
      .values({
        branchId: dto.branchId,
        name:     dto.name,
        phone:    dto.phone,
        email:    dto.email,
        idType:   dto.idType,
        idNumber: dto.idNumber,
        photoUrl: dto.photoUrl,
      })
      .returning();
    return inserted[0];
  }

  async update(id: string, dto: UpdateVisitorDto) {
    await this.findOne(id);
    const updated = await this.dbService.db
      .update(visitors)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(visitors.id, id))
      .returning();
    return updated[0];
  }

  async remove(id: string) {
    const visitor = await this.findOne(id);
    await this.dbService.db.delete(visitors).where(eq(visitors.id, id));
    return { message: `Visitor ${visitor.name} deleted`, id };
  }
}
