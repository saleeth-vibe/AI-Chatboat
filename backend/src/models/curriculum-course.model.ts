import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class CurriculumCourse extends Model<InferAttributes<CurriculumCourse>, InferCreationAttributes<CurriculumCourse>> {
  declare id: CreationOptional<number>;
  declare curriculumId: number;
  declare courseId: number;
  declare createdAt: CreationOptional<Date>;
}

CurriculumCourse.init(
  {
    id: primaryId(),
    curriculumId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    createdAt: requiredDate(),
  },
  {
    sequelize,
    tableName: 'curriculum_courses',
    modelName: 'CurriculumCourse',
    underscored: true,
    updatedAt: false,
  },
);
