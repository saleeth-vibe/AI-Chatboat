import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import type { OfferingStatus } from '../services/academic-rules';
import { primaryId, requiredDate } from './columns';

export class ClassCurriculumAssignment extends Model<
  InferAttributes<ClassCurriculumAssignment>,
  InferCreationAttributes<ClassCurriculumAssignment>
> {
  declare id: CreationOptional<number>;
  declare classId: number;
  declare academicTermId: number;
  declare curriculumId: number;
  declare status: OfferingStatus;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ClassCurriculumAssignment.init(
  {
    id: primaryId(),
    classId: { type: DataTypes.BIGINT, allowNull: false },
    academicTermId: { type: DataTypes.BIGINT, allowNull: false },
    curriculumId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('PLANNED', 'ONGOING', 'COMPLETED'), allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  {
    sequelize,
    tableName: 'class_curriculum_assignments',
    modelName: 'ClassCurriculumAssignment',
    underscored: true,
  },
);
