const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Property, Floor, User } = require('../models');

// ================================
// ✅ Helper: Create Error
// ================================
function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ================================
// ✅ Validation Schema
// ================================
const propertySchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  number_of_floors: Joi.number().integer().min(0).required(), // Can be 0 (only ground floor)
  has_basement: Joi.boolean().required(),
  manager_id: Joi.string().uuid().optional() 
});

const assignSchema = Joi.object({
  manager_id: Joi.string().uuid().required()
});

// ================================
// ✅ Create Property (with Floors)
// ================================
async function createProperty(data, user) {
  const { error, value } = propertySchema.validate(data);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  // Managers can only create properties assigned to themselves
  if (user.role === 'manager') {
    value.manager_id = user.id;
  } else if (user.role === 'admin' && value.manager_id) {
    // Admin can optionally assign to a specific manager during creation
    const manager = await User.findOne({ 
      where: { id: value.manager_id, role: 'manager', is_active: true } 
    });
    if (!manager) {
      throw createError('Invalid manager ID provided.', 400);
    }
  }

  value.id = uuidv4();

  const property = await Property.create(value);

  const floors = [];

  // ✅ Basement (level -1)
  if (value.has_basement) {
    floors.push({
      id: uuidv4(),
      property_id: property.id,
      level_number: -1,
      name: 'Basement'
    });
  }

  // ✅ Ground floor (always level 0)
  floors.push({
    id: uuidv4(),
    property_id: property.id,
    level_number: 0,
    name: 'Ground Floor'
  });

  // ✅ Additional floors (1 to number_of_floors)
  for (let i = 1; i <= value.number_of_floors; i++) {
    floors.push({
      id: uuidv4(),
      property_id: property.id,
      level_number: i,
      name: `Floor ${i}`
    });
  }

  await Floor.bulkCreate(floors);

  console.log(`Property created with ${floors.length} floors (Ground + ${value.number_of_floors} additional)`);

  return {
    success: true,
    message: 'Property created successfully with floors.',
    data: { 
      property: property.toJSON(), 
      floors: floors.map(f => ({ ...f }))
    }
  };
}

// ================================
// ✅ Get All Properties (with Pagination)
// ================================
async function getAllProperties(user, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const whereClause = { deleted_at: null };
  
  // ✅ Managers can only see properties assigned to them
  if (user.role === 'manager') {
    whereClause.manager_id = user.id; 
  }

  const [total, properties] = await Promise.all([
    Property.count({ where: whereClause }),
    Property.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { 
          model: Floor, 
          as: 'floorsForProperty',
          separate: true, // Fix nested ordering
          order: [['level_number', 'ASC']]
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    })
  ]);

  const totalPages = Math.ceil(total / limit);

  // ✅ Serialize Sequelize models to plain JSON
  return {
    success: true,
    data: {
      properties: properties.map(p => p.toJSON()),  // ✅ Convert to JSON
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    }
  };
}

// ================================
// ✅ Get Property by ID (Restricted Access)
// ================================
async function getPropertyById(id, user) {
  if (!id) {
    throw createError('Property ID is required.', 400);
  }

  const whereClause = { id, deleted_at: null };
  
  // ✅ Managers can only access their assigned properties
  if (user.role === 'manager') {
    whereClause.manager_id = user.id;
  }

  const property = await Property.findOne({
    where: whereClause,
    include: [
      { 
        model: Floor, 
        as: 'floorsForProperty',
        separate: true,
        order: [['level_number', 'ASC']]
      },
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'full_name', 'email']
      }
    ]
  });

  if (!property) {
    throw createError(
      user.role === 'manager' 
        ? 'Property not found or you do not have access to this property.' 
        : 'Property not found.',
      404
    );
  }

  // ✅ Convert to JSON
  return { 
    success: true, 
    data: property.toJSON()
  };
}

// ================================
// ✅ Update Property + Sync Floors
// ================================
async function updateProperty(id, data, user) {
  const { error, value } = propertySchema.validate(data, {
    presence: 'optional',
    abortEarly: false
  });
  
  if (error) {
    throw createError(error.details.map(e => e.message).join(', '), 400);
  }

  const whereClause = { id, deleted_at: null };
  
  // ✅ Managers can only update their assigned properties
  if (user.role === 'manager') {
    whereClause.manager_id = user.id;
    // Prevent managers from changing manager_id
    delete value.manager_id;
  }

  const property = await Property.findOne({
    where: whereClause,
    include: [{ model: Floor, as: 'floorsForProperty' }]
  });

  if (!property) {
    throw createError(
      user.role === 'manager'
        ? 'Property not found or you do not have access to this property.'
        : 'Property not found.',
      404
    );
  }

  // If admin is updating and provides manager_id, validate it
  if (user.role === 'admin' && value.manager_id !== undefined) {
    if (value.manager_id === null) {
      // Allow admin to unassign manager
      value.manager_id = null;
    } else {
      const manager = await User.findOne({ 
        where: { id: value.manager_id, role: 'manager', is_active: true } 
      });
      if (!manager) {
        throw createError('Invalid manager ID provided.', 400);
      }
    }
  }

  const oldNumFloors = property.number_of_floors;
  const oldHasBasement = property.has_basement;

  await property.update(value);

  const newNumFloors = property.number_of_floors;
  const newHasBasement = property.has_basement;

  // ✅ Basement addition/removal
  if (newHasBasement && !oldHasBasement) {
    await Floor.create({
      id: uuidv4(),
      property_id: property.id,
      level_number: -1,
      name: 'Basement'
    });
  } else if (!newHasBasement && oldHasBasement) {
    await Floor.destroy({ where: { property_id: property.id, level_number: -1 } });
  }

  // ✅ Floors above ground (levels 1 to number_of_floors)
  if (newNumFloors > oldNumFloors) {
    // Add new floors
    const floorsToAdd = [];
    for (let i = oldNumFloors + 1; i <= newNumFloors; i++) {
      floorsToAdd.push({
        id: uuidv4(),
        property_id: property.id,
        level_number: i,
        name: `Floor ${i}`
      });
    }
    await Floor.bulkCreate(floorsToAdd);
  } else if (newNumFloors < oldNumFloors) {
    // Remove extra floors (only those above newNumFloors)
    await Floor.destroy({
      where: { 
        property_id: property.id, 
        level_number: { [Op.gt]: newNumFloors, [Op.gte]: 1 }
      }
    });
  }

  const updated = await Property.findOne({
    where: { id },
    include: [
      { 
        model: Floor, 
        as: 'floorsForProperty',
        separate: true,
        order: [['level_number', 'ASC']]
      },
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'full_name', 'email']
      }
    ]
  });

  return {
    success: true,
    message: 'Property and floors updated successfully.',
    data: updated.toJSON() // ✅ Convert to JSON
  };
}

// ================================
// ✅ Soft Delete Property (Admin Only)
// ================================
async function deleteProperty(id, user) {
  // Only admins can delete properties
  if (user.role !== 'admin') {
    throw createError('Only admins can delete properties.', 403);
  }

  const property = await Property.findOne({ where: { id, deleted_at: null } });

  if (!property) {
    throw createError('Property not found.', 404);
  }

  await property.update({ deleted_at: new Date() });

  return {
    success: true,
    message: 'Property deleted successfully (soft delete).'
  };
}

// ================================
// ✅ Assign Property to Manager (Admin Only)
// ================================
async function assignPropertyToManager(propertyId, data, user) {
  // ✅ Only admins can assign properties to managers
  if (user.role !== 'admin') {
    throw createError('Only admins can assign a property to a manager.', 403);
  }

  const { error, value } = assignSchema.validate(data);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { manager_id } = value;

  const property = await Property.findOne({ 
    where: { id: propertyId, deleted_at: null } 
  });
  
  if (!property) {
    throw createError('Property not found.', 404);
  }

  // Validate manager exists and is active
  const manager = await User.findOne({ 
    where: { 
      id: manager_id, 
      role: 'manager', 
      is_active: true 
    } 
  });
  
  if (!manager) {
    throw createError('Manager not found, inactive, or user is not a manager.', 404);
  }

  await property.update({ manager_id });

  const updatedProperty = await Property.findOne({
    where: { id: propertyId },
    include: [
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'full_name', 'email']
      }
    ]
  });

  return {
    success: true,
    message: `Property assigned to manager ${manager.full_name}`,
    data: updatedProperty.toJSON() // ✅ Convert to JSON
  };
}

// ================================
// ✅ Get Floors by Property ID (Helper for Routes)
// ✅ CRITICAL FIX: Serialize Sequelize models
// ================================
async function getFloorsByPropertyId(propertyId, user) {
  if (!propertyId) {
    throw createError('Property ID is required.', 400);
  }

  const whereClause = { id: propertyId, deleted_at: null };
  
  // ✅ Managers can only access floors for their assigned properties
  if (user.role === 'manager') {
    whereClause.manager_id = user.id;
  }

  // Verify property exists and user has access
  const property = await Property.findOne({ 
    where: whereClause,
    attributes: ['id', 'name', 'location']
  });

  if (!property) {
    throw createError(
      user.role === 'manager'
        ? 'Property not found or you do not have access to this property.'
        : 'Property not found.',
      404
    );
  }

  // Get floors for this property
  const floors = await Floor.findAll({
    where: { property_id: propertyId },
    order: [['level_number', 'ASC']],
    include: [
      {
        model: Property,
        as: 'propertyForFloor',
        attributes: ['id', 'name', 'location']
      }
    ]
  });

  console.log(`getFloorsByPropertyId service - Found ${floors.length} floors for property ${propertyId}`);

  // ✅ CRITICAL FIX: Convert Sequelize instances to plain JSON
  return {
    success: true,
    data: {
      floors: floors.map(f => f.toJSON()), // ✅ Serialize each floor
      property: property.toJSON() // ✅ Serialize property
    }
  };
}

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  assignPropertyToManager,
  getFloorsByPropertyId
};