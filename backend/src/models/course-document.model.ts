import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export class CourseDocument extends Model<InferAttributes<CourseDocument>, InferCreationAttributes<CourseDocument>> {
  declare id: CreationOptional<number>;
  declare courseId: number;
  declare academicTermId: number;
  declare uploadedByFacultyId: number;
  declare title: string;
  declare originalFilename: string;
  declare mimeType: string;
  declare byteSize: number;
  declare pageCount: number | null;
  declare contentSha256: string;
  declare storagePath: string;
  declare status: DocumentStatus;
  declare errorMessage: string | null;
  declare embeddingModel: string;
  declare embeddingDimensions: number;
  declare chunkCount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CourseDocument.init(
  {
    id: primaryId(),
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    academicTermId: { type: DataTypes.BIGINT, allowNull: false },
    uploadedByFacultyId: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    originalFilename: { type: DataTypes.STRING(255), allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: false },
    byteSize: { type: DataTypes.INTEGER, allowNull: false },
    pageCount: { type: DataTypes.INTEGER, allowNull: true },
    contentSha256: { type: DataTypes.CHAR(64), allowNull: false },
    storagePath: { type: DataTypes.STRING(500), allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED'), allowNull: false },
    errorMessage: { type: DataTypes.STRING(500), allowNull: true },
    embeddingModel: { type: DataTypes.STRING(100), allowNull: false },
    embeddingDimensions: { type: DataTypes.SMALLINT, allowNull: false },
    chunkCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'course_documents', modelName: 'CourseDocument', underscored: true },
);
