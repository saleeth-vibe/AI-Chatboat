import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class CourseDocumentChunk extends Model<
  InferAttributes<CourseDocumentChunk>,
  InferCreationAttributes<CourseDocumentChunk>
> {
  declare id: CreationOptional<number>;
  declare documentId: number;
  declare chunkIndex: number;
  declare pageNumber: number | null;
  declare content: string;
  declare embedding: number[];
  declare createdAt: CreationOptional<Date>;
}

CourseDocumentChunk.init(
  {
    id: primaryId(),
    documentId: { type: DataTypes.BIGINT, allowNull: false },
    chunkIndex: { type: DataTypes.INTEGER, allowNull: false },
    pageNumber: { type: DataTypes.INTEGER, allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    embedding: { type: DataTypes.JSON, allowNull: false },
    createdAt: requiredDate(),
  },
  {
    sequelize,
    tableName: 'course_document_chunks',
    modelName: 'CourseDocumentChunk',
    underscored: true,
    updatedAt: false,
  },
);
