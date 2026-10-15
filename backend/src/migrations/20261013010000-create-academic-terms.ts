import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('academic_terms', {
      id: idColumn(),
      academic_year_id: foreignKey('academic_years', false),
      period_type: { type: DataTypes.ENUM('ODD', 'EVEN'), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      created_at: timestamp(),
      updated_at: timestamp(),
    });
    await queryInterface.addConstraint('academic_terms', {
      fields: ['academic_year_id', 'period_type'],
      type: 'unique',
      name: 'academic_terms_year_period_unique',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('academic_terms');
  },
};

function idColumn() {
  return { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false };
}

function timestamp() {
  return { type: DataTypes.DATE, allowNull: false };
}

function foreignKey(table: string, nullable: boolean) {
  return {
    type: DataTypes.BIGINT,
    allowNull: nullable,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  };
}
