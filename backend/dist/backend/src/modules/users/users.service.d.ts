import { DbService } from '../../db/db.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private dbService;
    private readonly logger;
    constructor(dbService: DbService);
    findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
    }): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateUserDto): Promise<any>;
    update(id: string, dto: UpdateUserDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
        id: string;
    }>;
}
