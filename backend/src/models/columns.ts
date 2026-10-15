import { DataTypes } from 'sequelize';

type ValueReader = { getDataValue(key: string): unknown };

export function primaryId() {
  return {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    get(this: ValueReader) {
      const raw = this.getDataValue('id');
      return raw == null ? raw : Number(raw);
    },
  };
}

export function requiredDate() {
  return { type: DataTypes.DATE, allowNull: false };
}
