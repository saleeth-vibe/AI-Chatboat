import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import type { PeriodType } from '../services/academic-rules';
import { primaryId, requiredDate } from './columns';

export class AcademicTerm extends Model<InferAttributes<AcademicTerm>, InferCreationAttributes<AcademicTerm>> {
  declare id: CreationOptional<number>;
  declare academicYearId: number;
  declare periodType: PeriodType;
  declare startDate: string;
  declare endDate: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AcademicTerm.init(
  {
    id: primaryId(),
    academicYearId: { type: DataTypes.BIGINT, allowNull: false },
    periodType: { type: DataTypes.ENUM('ODD', 'EVEN'), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'academic_terms', modelName: 'AcademicTerm', underscored: true },
);
