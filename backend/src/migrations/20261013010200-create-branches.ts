import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('branches', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      duration_years: { type: DataTypes.TINYINT, allowNull: false },
      sections_per_year: { type: DataTypes.TINYINT, allowNull: false },
      class_capacity: { type: DataTypes.INTEGER, allowNull: false },
      supports_first_year_cycles: { type: DataTypes.BOOLEAN, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('branches');
  },
};
