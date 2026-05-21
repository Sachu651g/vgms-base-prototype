import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(page: number, limit: number, search?: string, role?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    findOne(id: string): Promise<any>;
    create(createUserDto: CreateUserDto): Promise<any>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
        id: string;
    }>;
}
