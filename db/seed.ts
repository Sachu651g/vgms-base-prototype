import { db } from './index';
import { branches, departments, users, blacklist, visitors, visits, gatePasses, nightOutRequests } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // ── 1. Branch ──────────────────────────────────────────────────────────────
  const [branch] = await db
    .insert(branches)
    .values({
      name:     'Main Campus',
      code:     'MAIN',
      timezone: 'Asia/Kolkata',
    })
    .onConflictDoNothing()
    .returning();

  // If the branch already existed, fetch it
  const branchRow = branch ?? (
    await db.query.branches.findFirst({
      where: (b, { eq }) => eq(b.code, 'MAIN'),
    })
  );

  if (!branchRow) throw new Error('Failed to resolve branch');
  console.log(`  ✔ Branch: ${branchRow.name} (${branchRow.id})`);

  // ── 2. Departments ─────────────────────────────────────────────────────────
  const deptValues = [
    { branchId: branchRow.id, name: 'Computer Science & Engineering', code: 'CSE' },
    { branchId: branchRow.id, name: 'Electronics & Communication Engineering', code: 'ECE' },
  ];

  const insertedDepts = await db
    .insert(departments)
    .values(deptValues)
    .onConflictDoNothing()
    .returning();

  // Resolve departments (may already exist)
  const allDepts = insertedDepts.length === 2
    ? insertedDepts
    : await db.query.departments.findMany({
        where: (d, { inArray }) => inArray(d.code, ['CSE', 'ECE']),
      });

  const cseDept = allDepts.find((d) => d.code === 'CSE');
  const eceDept = allDepts.find((d) => d.code === 'ECE');

  if (!cseDept || !eceDept) throw new Error('Failed to resolve departments');
  console.log(`  ✔ Department: ${cseDept.name} (${cseDept.id})`);
  console.log(`  ✔ Department: ${eceDept.name} (${eceDept.id})`);

  // ── 3. Demo users (one per role) ───────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Vgms@1234', 12);

  type RoleConfig = {
    role: typeof users.$inferInsert['role'];
    name: string;
    departmentId: string | null;
  };

  const roleConfigs: RoleConfig[] = [
    { role: 'super_admin',    name: 'Super Admin',    departmentId: null },
    { role: 'branch_admin',   name: 'Branch Admin',   departmentId: null },
    { role: 'principal',      name: 'Principal',      departmentId: null },
    { role: 'hod',            name: 'HOD',            departmentId: cseDept.id },
    { role: 'faculty',        name: 'Faculty',        departmentId: cseDept.id },
    { role: 'warden',         name: 'Warden',         departmentId: null },
    { role: 'receptionist',   name: 'Receptionist',   departmentId: null },
    { role: 'security_head',  name: 'Security Head',  departmentId: null },
    { role: 'watchman',       name: 'Watchman',       departmentId: null },
    { role: 'student',        name: 'Student',        departmentId: cseDept.id },
  ];

  const userValues = roleConfigs.map(({ role, name, departmentId }) => ({
    branchId:            branchRow.id,
    departmentId:        departmentId ?? undefined,
    name,
    email:               `${role}@vgms.dev`,
    passwordHash,
    role,
    failedLoginAttempts: 0,
    lockedUntil:         null,
  }));

  const insertedUsers = await db
    .insert(users)
    .values(userValues)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✔ Inserted ${insertedUsers.length} demo user(s) (skipped existing)`);
  insertedUsers.forEach((u) => console.log(`      - ${u.email} [${u.role}]`));

  // ── 3b. Additional demo users with .com emails (for the new login UI) ──────
  const comUserValues = [
    { role: 'super_admin'  as const, name: 'Super Admin',    email: 'super_admin@vgms.com', phone: '9000000001' },
    { role: 'branch_admin' as const, name: 'Branch Admin',   email: 'admin@vgms.com',       phone: '9000000002' },
    { role: 'principal'    as const, name: 'Dr. Principal',  email: 'principal@vgms.com',   phone: '9000000003' },
    { role: 'hod'          as const, name: 'Dr. HOD CSE',    email: 'hod@vgms.com',         phone: '9000000004' },
    { role: 'warden'       as const, name: 'Warden Block A', email: 'warden@vgms.com',      phone: '9000000005' },
    { role: 'security_head'as const, name: 'Security Head',  email: 'security@vgms.com',    phone: '9000000006' },
    { role: 'watchman'     as const, name: 'Gate Watchman',  email: 'watchman@vgms.com',    phone: '9000000007' },
    { role: 'receptionist' as const, name: 'Front Desk',     email: 'reception@vgms.com',   phone: '9000000008' },
    { role: 'student'      as const, name: 'Student Ravi',   email: 'student@vgms.com',     phone: '9000000009' },
  ].map(u => ({
    branchId:            branchRow.id,
    departmentId:        cseDept?.id,
    name:                u.name,
    email:               u.email,
    passwordHash,
    role:                u.role,
    phone:               u.phone,
    failedLoginAttempts: 0,
    lockedUntil:         null as null,
  }));

  const insertedComUsers = await db
    .insert(users)
    .values(comUserValues)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✔ Inserted ${insertedComUsers.length} .com demo user(s) (skipped existing)`);
  insertedComUsers.forEach((u) => console.log(`      - ${u.email} [${u.role}]`));

  // Resolve specific user IDs needed for subsequent seed data
  const branchAdminUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'branch_admin@vgms.dev'),
  });
  const facultyUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'faculty@vgms.dev'),
  });
  const receptionistUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'receptionist@vgms.dev'),
  });
  const hodUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'hod@vgms.dev'),
  });
  const studentUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, 'student@vgms.dev'),
  });

  if (!branchAdminUser) throw new Error('Failed to resolve branch_admin user');
  if (!facultyUser)     throw new Error('Failed to resolve faculty user');
  if (!receptionistUser) throw new Error('Failed to resolve receptionist user');
  if (!hodUser)         throw new Error('Failed to resolve hod user');
  if (!studentUser)     throw new Error('Failed to resolve student user');

  // ── 4. Blacklist entry ─────────────────────────────────────────────────────
  const existingBlacklist = await db.query.blacklist.findFirst({
    where: (b, { eq }) => eq(b.phone, '9999999999'),
  });

  if (!existingBlacklist) {
    await db.insert(blacklist).values({
      name:      'Blocked Visitor',
      phone:     '9999999999',
      reason:    'Test blacklist entry',
      branchId:  branchRow.id,
      addedById: branchAdminUser.id,
    });
    console.log('  ✔ Blacklist entry inserted: Blocked Visitor (9999999999)');
  } else {
    console.log('  ✔ Blacklist entry already exists, skipping');
  }

  // ── 5. Sample visitors ─────────────────────────────────────────────────────
  const [visitor1Insert] = await db
    .insert(visitors)
    .values({
      name:      'John Doe',
      phone:     '8001001001',
      email:     'john@example.com',
      idType:    'Aadhar',
      idNumber:  'XXXX-XXXX-1001',
      branchId:  branchRow.id,
    })
    .onConflictDoNothing()
    .returning();

  const visitor1 = visitor1Insert ?? await db.query.visitors.findFirst({
    where: (v, { eq }) => eq(v.phone, '8001001001'),
  });

  const [visitor2Insert] = await db
    .insert(visitors)
    .values({
      name:      'Jane Smith',
      phone:     '8002002002',
      email:     'jane@example.com',
      idType:    'PAN',
      idNumber:  'ABCDE1234F',
      branchId:  branchRow.id,
    })
    .onConflictDoNothing()
    .returning();

  const visitor2 = visitor2Insert ?? await db.query.visitors.findFirst({
    where: (v, { eq }) => eq(v.phone, '8002002002'),
  });

  if (!visitor1) throw new Error('Failed to resolve visitor1');
  if (!visitor2) throw new Error('Failed to resolve visitor2');
  console.log(`  ✔ Visitor 1: ${visitor1.name} (${visitor1.id})`);
  console.log(`  ✔ Visitor 2: ${visitor2.name} (${visitor2.id})`);

  // ── 6. Sample visits ───────────────────────────────────────────────────────
  const now = new Date();

  const existingVisit1 = await db.query.visits.findFirst({
    where: (v, { eq }) => eq(v.visitorId, visitor1.id),
  });

  if (!existingVisit1) {
    await db.insert(visits).values({
      visitorId:               visitor1.id,
      hostUserId:              facultyUser.id,
      registeredById:          receptionistUser.id,
      purpose:                 'Academic discussion',
      expectedArrival:         new Date(now.getTime() + 60 * 60 * 1000),
      expectedDurationMinutes: 60,
      status:                  'pending',
      branchId:                branchRow.id,
    });
    console.log('  ✔ Visit 1 inserted: John Doe — Academic discussion (pending)');
  } else {
    console.log('  ✔ Visit 1 already exists, skipping');
  }

  const existingVisit2 = await db.query.visits.findFirst({
    where: (v, { eq }) => eq(v.visitorId, visitor2.id),
  });

  if (!existingVisit2) {
    await db.insert(visits).values({
      visitorId:               visitor2.id,
      hostUserId:              hodUser.id,
      registeredById:          receptionistUser.id,
      purpose:                 'Department meeting',
      expectedArrival:         new Date(now.getTime() + 2 * 60 * 60 * 1000),
      expectedDurationMinutes: 90,
      status:                  'approved',
      branchId:                branchRow.id,
    });
    console.log('  ✔ Visit 2 inserted: Jane Smith — Department meeting (approved)');
  } else {
    console.log('  ✔ Visit 2 already exists, skipping');
  }

  // ── 7. Sample gate passes ──────────────────────────────────────────────────
  const escalationDueAt = new Date(now.getTime() + 120 * 60 * 1000);

  const existingPass1 = await db.query.gatePasses.findFirst({
    where: (gp, { and, eq }) =>
      and(eq(gp.studentId, studentUser.id), eq(gp.destination, 'City Hospital')),
  });

  if (!existingPass1) {
    await db.insert(gatePasses).values({
      studentId:            studentUser.id,
      branchId:             branchRow.id,
      reason:               'Medical appointment',
      destination:          'City Hospital',
      requestedTimeOut:     new Date(now.getTime() + 3 * 60 * 60 * 1000),
      requestedTimeIn:      new Date(now.getTime() + 6 * 60 * 60 * 1000),
      status:               'pending',
      escalationDueAt,
      escalated:            false,
      currentApprovalLevel: 'hod',
    });
    console.log('  ✔ Gate pass 1 inserted: Medical appointment (pending)');
  } else {
    console.log('  ✔ Gate pass 1 already exists, skipping');
  }

  const existingPass2 = await db.query.gatePasses.findFirst({
    where: (gp, { and, eq }) =>
      and(eq(gp.studentId, studentUser.id), eq(gp.destination, 'Home')),
  });

  if (!existingPass2) {
    await db.insert(gatePasses).values({
      studentId:            studentUser.id,
      branchId:             branchRow.id,
      reason:               'Family visit',
      destination:          'Home',
      requestedTimeOut:     new Date(now.getTime() + 24 * 60 * 60 * 1000),
      requestedTimeIn:      new Date(now.getTime() + 48 * 60 * 60 * 1000),
      status:               'approved',
      escalationDueAt,
      escalated:            false,
      currentApprovalLevel: 'hod',
    });
    console.log('  ✔ Gate pass 2 inserted: Family visit (approved)');
  } else {
    console.log('  ✔ Gate pass 2 already exists, skipping');
  }

  // ── 8. Sample night-out request ───────────────────────────────────────────
  const existingNightOut = await db.query.nightOutRequests.findFirst({
    where: (nor, { and, eq }) =>
      and(eq(nor.studentId, studentUser.id), eq(nor.status, 'pending')),
  });

  if (!existingNightOut) {
    await db.insert(nightOutRequests).values({
      studentId:              studentUser.id,
      branchId:               branchRow.id,
      departureDatetime:      new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      expectedReturnDatetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      destinationAddress:     '123 Main Street, Hometown',
      reason:                 'Family function',
      parentConsentUrl:       'https://example.com/consent/sample.pdf',
      status:                 'pending',
      wardenConsentConfirmed: false,
    });
    console.log('  ✔ Night-out request inserted: Family function (pending)');
  } else {
    console.log('  ✔ Night-out request already exists, skipping');
  }

  console.log('✅ Seed complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });

export { seed };
