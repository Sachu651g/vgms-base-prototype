declare const ROLES: readonly ["super_admin", "branch_admin", "principal", "hod", "faculty", "warden", "security_head", "watchman", "receptionist", "student"];
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    role?: typeof ROLES[number];
    phone?: string;
    isActive?: boolean;
    branchId?: string;
    departmentId?: string;
}
export {};
