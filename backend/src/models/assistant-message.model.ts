import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../database/connection';
import { primaryId, requiredDate } from './columns';

export type AssistantMessageRole = 'USER' | 'ASSISTANT';

export type AnswerSource = {
  documentId: number;
  title: string;
  pageNumber: number | null;
};

export class AssistantMessage extends Model<InferAttributes<AssistantMessage>, InferCreationAttributes<AssistantMessage>> {
  declare id: CreationOptional<number>;
  declare chatId: number;
  declare role: AssistantMessageRole;
  declare content: string;
  declare sources: AnswerSource[] | null;
  declare createdAt: CreationOptional<Date>;
}

AssistantMessage.init(
  {
    id: primaryId(),
    chatId: { type: DataTypes.BIGINT, allowNull: false },
    role: { type: DataTypes.ENUM('USER', 'ASSISTANT'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    sources: { type: DataTypes.JSON, allowNull: true },
    createdAt: requiredDate(),
  },
  {
    sequelize,
    tableName: 'assistant_messages',
    modelName: 'AssistantMessage',
    underscored: true,
    updatedAt: false,
  },
);
