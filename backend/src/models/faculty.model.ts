import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class Faculty extends Model<InferAttributes<Faculty>, InferCreationAttributes<Faculty>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare employeeNumber: string;
  declare name: string;
  declare affiliationType: 'BRANCH' | 'DEPARTMENT';
  declare branchId: number | null;
  declare departmentId: number | null;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Faculty.init(
  {
    id: primaryId(),
    userId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    affiliationType: { type: DataTypes.ENUM('BRANCH', 'DEPARTMENT'), allowNull: false },
    branchId: { type: DataTypes.BIGINT, allowNull: true },
    departmentId: { type: DataTypes.BIGINT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'faculty', modelName: 'Faculty', underscored: true },
);
