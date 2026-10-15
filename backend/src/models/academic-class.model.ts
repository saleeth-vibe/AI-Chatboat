import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class AcademicClass extends Model<InferAttributes<AcademicClass>, InferCreationAttributes<AcademicClass>> {
  declare id: CreationOptional<number>;
  declare branchId: number;
  declare yearLevel: number;
  declare sectionCode: string;
  declare capacity: number;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AcademicClass.init(
  {
    id: primaryId(),
    branchId: { type: DataTypes.BIGINT, allowNull: false },
    yearLevel: { type: DataTypes.TINYINT, allowNull: false },
    sectionCode: { type: DataTypes.STRING(10), allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'classes', modelName: 'AcademicClass', underscored: true },
);
