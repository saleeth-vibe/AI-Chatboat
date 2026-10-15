import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class FacultyCourseAssignment extends Model<
  InferAttributes<FacultyCourseAssignment>,
  InferCreationAttributes<FacultyCourseAssignment>
> {
  declare id: CreationOptional<number>;
  declare facultyId: number;
  declare courseId: number;
  declare academicTermId: number;
  declare status: 'ACTIVE' | 'CANCELLED';
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

FacultyCourseAssignment.init(
  {
    id: primaryId(),
    facultyId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    academicTermId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('ACTIVE', 'CANCELLED'), allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'faculty_course_assignments', modelName: 'FacultyCourseAssignment', underscored: true },
);
