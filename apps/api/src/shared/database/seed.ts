import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/data-source';
import { Commerce } from '../../modules/commerce/entities/commerce.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { Supplier } from '../../modules/supplier/entities/supplier.entity';

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected for seeding...');

  const commerceRepo = AppDataSource.getRepository(Commerce);
  const userRepo = AppDataSource.getRepository(User);
  const supplierRepo = AppDataSource.getRepository(Supplier);

  // 1. Create demo commerce
  let commerce = await commerceRepo.findOne({ where: { identifier: 'demo' } });
  if (!commerce) {
    commerce = commerceRepo.create({
      name: 'Comercio Demo',
      identifier: 'demo',
      email: 'demo@pricehub.com',
      phone: '+54 11 1234-5678',
    });
    commerce = await commerceRepo.save(commerce);
    console.log('Created commerce: Comercio Demo');
  } else {
    console.log('Commerce "Comercio Demo" already exists');
  }

  // 2. Create admin user
  let admin = await userRepo.findOne({ where: { email: 'admin@pricehub.com' } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    admin = userRepo.create({
      name: 'Admin',
      email: 'admin@pricehub.com',
      passwordHash,
      role: 'admin',
      commerceId: null,
    });
    await userRepo.save(admin);
    console.log('Created admin user: admin@pricehub.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  // 3. Create commerce user
  let demoUser = await userRepo.findOne({ where: { email: 'demo@pricehub.com' } });
  if (!demoUser) {
    const passwordHash = await bcrypt.hash('demo123', 12);
    demoUser = userRepo.create({
      name: 'Demo User',
      email: 'demo@pricehub.com',
      passwordHash,
      role: 'commerce',
      commerceId: commerce.id,
    });
    await userRepo.save(demoUser);
    console.log('Created commerce user: demo@pricehub.com / demo123');
  } else {
    console.log('Demo user already exists');
  }

  // 4. Create sample suppliers
  const suppliersData = [
    {
      name: 'Distribuidora Central',
      supplierCode: 'DC-001',
      description: 'Distribuidor mayorista de productos alimenticios',
      contactName: 'Juan Perez',
      contactEmail: 'juan@distcentral.com',
      contactPhone: '+54 11 5555-0001',
    },
    {
      name: 'Bebidas del Sur',
      supplierCode: 'BS-001',
      description: 'Proveedor de bebidas y gaseosas',
      contactName: 'Maria Garcia',
      contactEmail: 'maria@bebidasdelsur.com',
      contactPhone: '+54 11 5555-0002',
    },
    {
      name: 'Lacteos Premium',
      supplierCode: 'LP-001',
      description: 'Proveedor de productos lacteos',
      contactName: 'Carlos Lopez',
      contactEmail: 'carlos@lacteospremium.com',
      contactPhone: '+54 11 5555-0003',
    },
  ];

  for (const data of suppliersData) {
    const existing = await supplierRepo.findOne({
      where: { commerceId: commerce.id, supplierCode: data.supplierCode },
    });
    if (!existing) {
      const supplier = supplierRepo.create({ ...data, commerceId: commerce.id });
      await supplierRepo.save(supplier);
      console.log(`Created supplier: ${data.name}`);
    } else {
      console.log(`Supplier "${data.name}" already exists`);
    }
  }

  console.log('\nSeed completed!');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
