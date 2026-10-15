import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export class AssistantChat extends Model<InferAttributes<AssistantChat>, InferCreationAttributes<AssistantChat>> {
  declare id: CreationOptional<number>;
  declare studentId: number;
  declare courseId: number;
  declare academicTermId: number;
  declare title: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AssistantChat.init(
  {
    id: primaryId(),
    studentId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    academicTermId: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    createdAt: requiredDate(),
    updatedAt: requiredDate(),
  },
  { sequelize, tableName: 'assistant_chats', modelName: 'AssistantChat', underscored: true },
);
