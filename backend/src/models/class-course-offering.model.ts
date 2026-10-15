import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import type { OfferingStatus } from '../services/academic-rules';
import { primaryId, requiredDate } from './columns';

export class ClassCourseOffering extends Model<
  InferAttributes<ClassCourseOffering>,
  InferCreationAttributes<ClassCourseOffering>
> {
  declare id: CreationOptional<number>;
  declare classCurriculumAssignmentId: number;
  declare courseId: number;
  declare assignedFacultyId: number | null;
  declare status: OfferingStatus;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ClassCourseOffering.init(
  {
    id: primaryId(),
    classCurriculumAssignmentId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    assignedFacultyId: { type: DataTypes.BIGINT, allowNull: true },
    status: { type: DataTypes.ENUM('PLANNED', 'ONGOING', 'COMPLETED'), allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'class_course_offerings', modelName: 'ClassCourseOffering', underscored: true },
);
