import { randomUUID } from 'expo-crypto';

// Every locally created row gets a real UUID so it can be pushed to Supabase
// as-is (all cloud tables use UUID primary keys) when the user is premium.
export function newId(): string {
  return randomUUID();
}
