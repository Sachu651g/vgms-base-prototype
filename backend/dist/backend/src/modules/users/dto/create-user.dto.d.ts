export type UserRole = 'super_admin' | 'branch_admin' | 'principal' | 'hod' | 'faculty' | 'warden' | 'security_head' | 'watchman' | 'receptionist' | 'student';
export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    branchId?: string;
    departmentId?: string;
}
