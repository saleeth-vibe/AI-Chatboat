const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('course_documents', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      course_id: foreignKey('courses'),
      academic_term_id: foreignKey('academic_terms'),
      uploaded_by_faculty_id: foreignKey('faculty'),
      title: { type: DataTypes.STRING(200), allowNull: false },
      original_filename: { type: DataTypes.STRING(255), allowNull: false },
      mime_type: { type: DataTypes.STRING(100), allowNull: false },
      byte_size: { type: DataTypes.INTEGER, allowNull: false },
      page_count: { type: DataTypes.INTEGER, allowNull: true },
      content_sha256: { type: DataTypes.CHAR(64), allowNull: false },
      storage_path: { type: DataTypes.STRING(500), allowNull: false },
      status: { type: DataTypes.ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED'), allowNull: false },
      error_message: { type: DataTypes.STRING(500), allowNull: true },
      embedding_model: { type: DataTypes.STRING(100), allowNull: false },
      embedding_dimensions: { type: DataTypes.SMALLINT, allowNull: false },
      chunk_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('course_documents', {
      fields: ['course_id', 'academic_term_id', 'content_sha256'],
      type: 'unique',
      name: 'course_document_hash_unique',
    });
    await queryInterface.addIndex('course_documents', ['course_id', 'academic_term_id', 'status'], {
      name: 'course_documents_term_status_index',
    });

    await queryInterface.createTable('course_document_chunks', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      document_id: foreignKey('course_documents'),
      chunk_index: { type: DataTypes.INTEGER, allowNull: false },
      page_number: { type: DataTypes.INTEGER, allowNull: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      embedding: { type: DataTypes.JSON, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('course_document_chunks', {
      fields: ['document_id', 'chunk_index'],
      type: 'unique',
      name: 'course_document_chunk_index_unique',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('course_document_chunks');
    await queryInterface.dropTable('course_documents');
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


