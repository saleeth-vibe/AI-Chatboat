import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class Branch extends Model<InferAttributes<Branch>, InferCreationAttributes<Branch>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare code: string;
  declare durationYears: number;
  declare sectionsPerYear: number;
  declare classCapacity: number;
  declare supportsFirstYearCycles: boolean;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Branch.init(
  {
    id: primaryId(),
    name: { type: DataTypes.STRING(150), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    durationYears: { type: DataTypes.TINYINT, allowNull: false },
    sectionsPerYear: { type: DataTypes.TINYINT, allowNull: false },
    classCapacity: { type: DataTypes.INTEGER, allowNull: false },
    supportsFirstYearCycles: { type: DataTypes.BOOLEAN, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'branches', modelName: 'Branch', underscored: true },
);
