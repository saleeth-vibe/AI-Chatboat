import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('class_curriculum_assignments', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      class_id: foreignKey('classes'),
      academic_term_id: foreignKey('academic_terms'),
      curriculum_id: foreignKey('curricula'),
      status: { type: DataTypes.ENUM('PLANNED', 'ONGOING', 'COMPLETED'), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('class_curriculum_assignments', {
      fields: ['class_id', 'academic_term_id'],
      type: 'unique',
      name: 'class_term_curriculum_unique',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('class_curriculum_assignments');
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
