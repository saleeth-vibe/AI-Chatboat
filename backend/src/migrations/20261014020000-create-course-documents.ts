// Workshop starter: faculty and student dashboard code is commented out. The admin dashboard stays active.
// import { DataTypes, type QueryInterface } from 'sequelize';
//
// module.exports = {
//   async up(queryInterface: QueryInterface): Promise<void> {
//     await queryInterface.createTable('course_documents', {
//       id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
//       course_id: foreignKey('courses'),
//       academic_term_id: foreignKey('academic_terms'),
//       uploaded_by_faculty_id: foreignKey('faculty'),
//       title: { type: DataTypes.STRING(200), allowNull: false },
//       original_filename: { type: DataTypes.STRING(255), allowNull: false },
//       mime_type: { type: DataTypes.STRING(100), allowNull: false },
//       byte_size: { type: DataTypes.INTEGER, allowNull: false },
//       page_count: { type: DataTypes.INTEGER, allowNull: true },
//       content_sha256: { type: DataTypes.CHAR(64), allowNull: false },
//       storage_path: { type: DataTypes.STRING(500), allowNull: false },
//       status: { type: DataTypes.ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED'), allowNull: false },
//       error_message: { type: DataTypes.STRING(500), allowNull: true },
//       embedding_model: { type: DataTypes.STRING(100), allowNull: false },
//       embedding_dimensions: { type: DataTypes.SMALLINT, allowNull: false },
//       chunk_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
//       created_at: { type: DataTypes.DATE, allowNull: false },
//       updated_at: { type: DataTypes.DATE, allowNull: false },
//     });
//     await queryInterface.addConstraint('course_documents', {
//       fields: ['course_id', 'academic_term_id', 'content_sha256'],
//       type: 'unique',
//       name: 'course_document_hash_unique',
//     });
//     await queryInterface.addIndex('course_documents', ['course_id', 'academic_term_id', 'status'], {
//       name: 'course_documents_term_status_index',
//     });
//   },
//
//   async down(queryInterface: QueryInterface): Promise<void> {
//     await queryInterface.dropTable('course_documents');
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
