require('dotenv').config();

const shared = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  migrationStorageTableName: 'sequelize_meta',
};

module.exports = {
  development: shared,
  test: shared,
  production: shared,
};
