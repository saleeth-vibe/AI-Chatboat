const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('assistant_chats', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      student_id: foreignKey('students'),
      course_id: foreignKey('courses'),
      academic_term_id: foreignKey('academic_terms'),
      title: { type: DataTypes.STRING(120), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('assistant_chats', ['student_id', 'updated_at'], {
      name: 'assistant_chats_student_updated_index',
    });

    await queryInterface.createTable('assistant_messages', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      chat_id: foreignKey('assistant_chats'),
      role: { type: DataTypes.ENUM('USER', 'ASSISTANT'), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      sources: { type: DataTypes.JSON, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('assistant_messages', ['chat_id', 'id'], {
      name: 'assistant_messages_chat_index',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('assistant_messages');
    await queryInterface.dropTable('assistant_chats');
  },
};

function foreignKey(table) {
  return {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  };
}


