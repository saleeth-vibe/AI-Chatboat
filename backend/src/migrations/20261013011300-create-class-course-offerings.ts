import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('class_course_offerings', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      class_curriculum_assignment_id: foreignKey('class_curriculum_assignments'),
      course_id: foreignKey('courses'),
      assigned_faculty_id: foreignKey('faculty', true),
      status: { type: DataTypes.ENUM('PLANNED', 'ONGOING', 'COMPLETED'), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('class_course_offerings', {
      fields: ['class_curriculum_assignment_id', 'course_id'],
      type: 'unique',
      name: 'class_offering_course_unique',
    });
    await queryInterface.addIndex('class_course_offerings', ['assigned_faculty_id'], {
      name: 'class_offerings_faculty_index',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('class_course_offerings');
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
