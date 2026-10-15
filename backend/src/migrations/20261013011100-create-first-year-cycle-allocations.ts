import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('first_year_cycle_allocations', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      cohort_academic_year_id: foreignKey('academic_years'),
      class_id: foreignKey('classes'),
      semester_1_cycle_type: { type: DataTypes.ENUM('P', 'C'), allowNull: false },
      allocated_at: { type: DataTypes.DATE, allowNull: false },
      allocated_by_user_id: foreignKey('users', true),
    });
    await queryInterface.addConstraint('first_year_cycle_allocations', {
      fields: ['cohort_academic_year_id', 'class_id'],
      type: 'unique',
      name: 'first_year_cycle_cohort_class_unique',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('first_year_cycle_allocations');
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
