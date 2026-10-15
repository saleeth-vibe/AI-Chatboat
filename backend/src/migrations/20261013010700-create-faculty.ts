import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('faculty', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { ...foreignKey('users'), unique: true },
      employee_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      affiliation_type: { type: DataTypes.ENUM('BRANCH', 'DEPARTMENT'), allowNull: false },
      branch_id: foreignKey('branches', true),
      department_id: foreignKey('departments', true),
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('faculty');
  },
};

function foreignKey(table: string, nullable = false) {
  return {
    type: DataTypes.BIGINT,
    allowNull: nullable,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  };
}
