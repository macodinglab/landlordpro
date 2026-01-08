const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../db');

class Staff extends Model {}

Staff.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    full_name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },

    position: {
      type: DataTypes.STRING,
      allowNull: false
    },

    department: {
      type: DataTypes.STRING,
      allowNull: true
    },

    base_salary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },

    allowance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },

    gross_salary: {
      // base_salary + allowance
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },

    rssb_contribution: {
      // 6% of base_salary
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },

    tpr: {
      // additional deduction amount
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },

    net_salary: {
      // gross_salary - rssb_contribution - tpr
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'RWF'
    },

    social_security_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    national_id: {
      type: DataTypes.STRING,
      allowNull: true
    },

    picture_url: {
      type: DataTypes.STRING,
      allowNull: true
    },

    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active'
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Staff',
    tableName: 'staff',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

module.exports = Staff;

