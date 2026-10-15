import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('student_class_enrolments', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      student_id: foreignKey('students'),
      class_id: foreignKey('classes'),
      start_academic_year_id: foreignKey('academic_years'),
      end_academic_year_id: foreignKey('academic_years', true),
      status: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'TRANSFERRED'), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('student_class_enrolments', ['class_id', 'status'], {
      name: 'enrolments_class_status_index',
    });
    await queryInterface.addIndex('student_class_enrolments', ['student_id', 'status'], {
      name: 'enrolments_student_status_index',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('student_class_enrolments');
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
