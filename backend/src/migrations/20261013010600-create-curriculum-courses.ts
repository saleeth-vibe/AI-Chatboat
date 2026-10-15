import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('curriculum_courses', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      curriculum_id: foreignKey('curricula'),
      course_id: foreignKey('courses'),
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('curriculum_courses', {
      fields: ['curriculum_id', 'course_id'],
      type: 'unique',
      name: 'curriculum_courses_unique',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('curriculum_courses');
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
