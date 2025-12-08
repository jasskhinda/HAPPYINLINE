/**
 * Role Display Utilities
 *
 * Maps internal database role values to user-friendly display names
 */

/**
 * Get display name for a role
 * @param {string} role - The database role value
 * @returns {string} - The user-friendly display name
 */
export const getRoleDisplayName = (role) => {
  const roleMap = {
    'barber': 'Staff',
    'staff': 'Staff',
    'owner': 'Owner',
    'admin': 'Admin',
    'super_admin': 'Super Admin',
    'customer': 'Customer',
  };

  return roleMap[role] || role;
};

/**
 * Get plural display name for a role
 * @param {string} role - The database role value
 * @returns {string} - The plural user-friendly display name
 */
export const getRolePluralName = (role) => {
  const pluralMap = {
    'barber': 'Staff Members',
    'staff': 'Staff Members',
    'owner': 'Owners',
    'admin': 'Admins',
    'super_admin': 'Super Admins',
    'customer': 'Customers',
  };

  return pluralMap[role] || role + 's';
};
