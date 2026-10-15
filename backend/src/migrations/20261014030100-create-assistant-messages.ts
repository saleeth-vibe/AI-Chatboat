// Workshop starter: faculty and student dashboard code is commented out. The admin dashboard stays active.
// import { DataTypes, type QueryInterface } from 'sequelize';
//
// module.exports = {
//   async up(queryInterface: QueryInterface): Promise<void> {
//     await queryInterface.createTable('assistant_messages', {
//       id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
//       chat_id: foreignKey('assistant_chats'),
//       role: { type: DataTypes.ENUM('USER', 'ASSISTANT'), allowNull: false },
//       content: { type: DataTypes.TEXT, allowNull: false },
//       sources: { type: DataTypes.JSON, allowNull: true },
//       created_at: { type: DataTypes.DATE, allowNull: false },
//     });
//     await queryInterface.addIndex('assistant_messages', ['chat_id', 'id'], {
//       name: 'assistant_messages_chat_index',
//     });
//   },
//
//   async down(queryInterface: QueryInterface): Promise<void> {
//     await queryInterface.dropTable('assistant_messages');
//   },
// };
//
// function foreignKey(table: string) {
//   return {
//     type: DataTypes.BIGINT,
//     allowNull: false,
//     references: { model: table, key: 'id' },
//     onUpdate: 'CASCADE',
//     onDelete: 'RESTRICT',
//   };
// }

module.exports = {
  async up(): Promise<void> {
    // Schema for this faculty or student dashboard feature is commented out above.
  },
  async down(): Promise<void> {
    // Schema for this faculty or student dashboard feature is commented out above.
  },
};
