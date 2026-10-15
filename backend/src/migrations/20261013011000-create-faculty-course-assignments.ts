import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('faculty_course_assignments', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      faculty_id: foreignKey('faculty'),
      course_id: foreignKey('courses'),
      academic_term_id: foreignKey('academic_terms'),
      status: { type: DataTypes.ENUM('ACTIVE', 'CANCELLED'), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('faculty_course_assignments', {
      fields: ['faculty_id', 'course_id', 'academic_term_id'],
      type: 'unique',
      name: 'faculty_course_term_unique',
    });
    await queryInterface.addIndex('faculty_course_assignments', ['course_id', 'academic_term_id', 'status'], {
      name: 'faculty_course_term_status_index',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('faculty_course_assignments');
  },
};

function foreignKey(table: string) {
  return {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  };
}
