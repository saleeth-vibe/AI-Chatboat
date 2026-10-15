import { DataTypes, type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('curricula', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      scope_type: { type: DataTypes.ENUM('GLOBAL_CYCLE', 'BRANCH'), allowNull: false },
      branch_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      semester_level: { type: DataTypes.TINYINT, allowNull: true },
      cycle_type: { type: DataTypes.ENUM('P', 'C'), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('curricula');
  },
};
