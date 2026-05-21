"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcryptjs"));
const db_service_1 = require("../../db/db.service");
const index_1 = require("../../../../db/schema/index");
function sanitize(u) {
    const _a = u, { passwordHash } = _a, safe = __rest(_a, ["passwordHash"]);
    void passwordHash;
    return safe;
}
let UsersService = UsersService_1 = class UsersService {
    constructor(dbService) {
        this.dbService = dbService;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async findAll(params) {
        var _a, _b;
        const page = Math.max(1, (_a = params.page) !== null && _a !== void 0 ? _a : 1);
        const limit = Math.min(100, Math.max(1, (_b = params.limit) !== null && _b !== void 0 ? _b : 10));
        const offset = (page - 1) * limit;
        let result = await this.dbService.db
            .select()
            .from(index_1.users)
            .limit(limit)
            .offset(offset);
        if (params.search) {
            const q = params.search.toLowerCase();
            result = result.filter(u => u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q));
        }
        if (params.role) {
            result = result.filter(u => u.role === params.role);
        }
        return {
            data: result.map(sanitize),
            meta: { page, limit, total: result.length },
        };
    }
    async findOne(id) {
        const result = await this.dbService.db
            .select()
            .from(index_1.users)
            .where((0, drizzle_orm_1.eq)(index_1.users.id, id))
            .limit(1);
        if (!result.length) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return sanitize(result[0]);
    }
    async create(dto) {
        const existing = await this.dbService.db
            .select()
            .from(index_1.users)
            .where((0, drizzle_orm_1.eq)(index_1.users.email, dto.email))
            .limit(1);
        if (existing.length) {
            throw new common_1.ConflictException(`A user with email ${dto.email} already exists`);
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const inserted = await this.dbService.db.insert(index_1.users).values({
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: dto.role,
            phone: dto.phone,
            branchId: dto.branchId,
            departmentId: dto.departmentId,
            isActive: true,
            failedLoginAttempts: 0,
        }).returning();
        this.logger.log(`Created user ${inserted[0].email} (${inserted[0].role})`);
        return sanitize(inserted[0]);
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.email) {
            const clash = await this.dbService.db
                .select()
                .from(index_1.users)
                .where((0, drizzle_orm_1.eq)(index_1.users.email, dto.email))
                .limit(1);
            if (clash.length && clash[0].id !== id) {
                throw new common_1.ConflictException(`Email ${dto.email} is already taken by another user`);
            }
        }
        const setValues = { updatedAt: new Date() };
        if (dto.name !== undefined)
            setValues.name = dto.name;
        if (dto.email !== undefined)
            setValues.email = dto.email;
        if (dto.role !== undefined)
            setValues.role = dto.role;
        if (dto.phone !== undefined)
            setValues.phone = dto.phone;
        if (dto.branchId !== undefined)
            setValues.branchId = dto.branchId;
        if (dto.departmentId !== undefined)
            setValues.departmentId = dto.departmentId;
        if (dto.isActive !== undefined)
            setValues.isActive = dto.isActive;
        const updated = await this.dbService.db
            .update(index_1.users)
            .set(setValues)
            .where((0, drizzle_orm_1.eq)(index_1.users.id, id))
            .returning();
        this.logger.log(`Updated user ${id}`);
        return sanitize(updated[0]);
    }
    async remove(id) {
        const user = await this.findOne(id);
        await this.dbService.db.delete(index_1.users).where((0, drizzle_orm_1.eq)(index_1.users.id, id));
        this.logger.log(`Deleted user ${id} (${user.email})`);
        return { message: `User ${user.email} deleted successfully`, id };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], UsersService);
//# sourceMappingURL=users.service.js.map