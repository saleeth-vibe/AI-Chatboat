import { QueryTypes, type QueryInterface } from 'sequelize';
import { hashPassword } from '../utils/password';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding the admin user.');
    }
    if (password.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
    }

    const existing = await queryInterface.sequelize.query<{ id: number }>(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existing.length > 0) {
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert('users', [
      {
        email,
        password_hash: await hashPassword(password),
        role: 'ADMIN',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!email) {
      return;
    }
    await queryInterface.bulkDelete('users', { email });
  },
};
