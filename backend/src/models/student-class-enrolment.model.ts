import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export type EnrolmentStatus = 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED';

export class StudentClassEnrolment extends Model<
  InferAttributes<StudentClassEnrolment>,
  InferCreationAttributes<StudentClassEnrolment>
> {
  declare id: CreationOptional<number>;
  declare studentId: number;
  declare classId: number;
  declare startAcademicYearId: number;
  declare endAcademicYearId: number | null;
  declare status: EnrolmentStatus;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

StudentClassEnrolment.init(
  {
    id: primaryId(),
    studentId: { type: DataTypes.BIGINT, allowNull: false },
    classId: { type: DataTypes.BIGINT, allowNull: false },
    startAcademicYearId: { type: DataTypes.BIGINT, allowNull: false },
    endAcademicYearId: { type: DataTypes.BIGINT, allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'TRANSFERRED'), allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'student_class_enrolments', modelName: 'StudentClassEnrolment', underscored: true },
);
