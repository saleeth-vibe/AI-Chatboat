import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class Student extends Model<InferAttributes<Student>, InferCreationAttributes<Student>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare universityId: string;
  declare name: string;
  declare branchId: number;
  declare entryYearLevel: number;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Student.init(
  {
    id: primaryId(),
    userId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    universityId: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    branchId: { type: DataTypes.BIGINT, allowNull: false },
    entryYearLevel: { type: DataTypes.TINYINT, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'students', modelName: 'Student', underscored: true },
);
