import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import type { CycleType } from '../services/academic-rules';
import { primaryId } from './columns';

export class FirstYearCycleAllocation extends Model<
  InferAttributes<FirstYearCycleAllocation>,
  InferCreationAttributes<FirstYearCycleAllocation>
> {
  declare id: CreationOptional<number>;
  declare cohortAcademicYearId: number;
  declare classId: number;
  declare semester1CycleType: CycleType;
  declare allocatedAt: Date;
  declare allocatedByUserId: number | null;
}

FirstYearCycleAllocation.init(
  {
    id: primaryId(),
    cohortAcademicYearId: { type: DataTypes.BIGINT, allowNull: false },
    classId: { type: DataTypes.BIGINT, allowNull: false },
    semester1CycleType: { type: DataTypes.ENUM('P', 'C'), allowNull: false, field: 'semester_1_cycle_type' },
    allocatedAt: { type: DataTypes.DATE, allowNull: false },
    allocatedByUserId: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    tableName: 'first_year_cycle_allocations',
    modelName: 'FirstYearCycleAllocation',
    underscored: true,
    timestamps: false,
  },
);
