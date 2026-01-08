const sequelize = require('./db');

(async () => {
    try {
        const [properties] = await sequelize.query(`
      SELECT p.id, p.name, p.manager_id, u.full_name as manager_name
      FROM properties p
      LEFT JOIN users u ON p.manager_id = u.id
      LIMIT 10
    `);

        console.log('Properties and their managers:');
        console.log(JSON.stringify(properties, null, 2));

        const [managers] = await sequelize.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE role = 'manager'
    `);

        console.log('\nManagers in system:');
        console.log(JSON.stringify(managers, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
