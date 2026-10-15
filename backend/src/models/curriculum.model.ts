import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import type { CycleType } from '../services/academic-rules';
import { primaryId, requiredDate } from './columns';

export class Curriculum extends Model<InferAttributes<Curriculum>, InferCreationAttributes<Curriculum>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare scopeType: 'GLOBAL_CYCLE' | 'BRANCH';
  declare branchId: number | null;
  declare semesterLevel: number | null;
  declare cycleType: CycleType | null;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Curriculum.init(
  {
    id: primaryId(),
    name: { type: DataTypes.STRING(150), allowNull: false },
    scopeType: { type: DataTypes.ENUM('GLOBAL_CYCLE', 'BRANCH'), allowNull: false },
    branchId: { type: DataTypes.BIGINT, allowNull: true },
    semesterLevel: { type: DataTypes.TINYINT, allowNull: true },
    cycleType: { type: DataTypes.ENUM('P', 'C'), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'curricula', modelName: 'Curriculum', underscored: true },
);
