/**
 * Clear all other role tokens and user data from localStorage so only one
 * session exists at a time. Prevents "back to admin dashboard" on refresh
 * when user logged in as Sales/CP/PM/Employee/Client (admin token was still present).
 * Call this after successful login for the current role.
 * @param {'admin'|'sales'|'cp'|'pm'|'employee'|'client'} keepRole - Role that just logged in; only these keys are kept.
 */
export function clearOtherRoleSessions(keepRole) {
  // Logic disabled as per user request to allow concurrent role sessions.
  // Each role now manages its own tokens in isolation.
  console.log(`🔑 Login for role: ${keepRole}. Concurrent sessions allowed.`);

  /*
  const keepKeys = getKeysForRole(keepRole);
  const allKeys = [
    'adminToken',
    'adminUser',
    'salesToken',
    'salesUser',
    'cpToken',
    'cpUser',
    'pmToken',
    'pmUser',
    'employeeToken',
    'employeeUser',
    'clientToken',
    'clientUser',
    'fcm_token_web'
  ];
  allKeys.forEach((key) => {
    if (!keepKeys.includes(key)) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
    }
  });
  */
}

function getKeysForRole(role) {
  switch (role) {
    case 'admin':
      return ['adminToken', 'adminUser'];
    case 'sales':
      return ['salesToken', 'salesUser'];
    case 'cp':
      return ['cpToken', 'cpUser'];
    case 'pm':
      return ['pmToken', 'pmUser'];
    case 'employee':
      return ['employeeToken', 'employeeUser'];
    case 'client':
      return ['clientToken', 'clientUser'];
    default:
      return [];
  }
}
