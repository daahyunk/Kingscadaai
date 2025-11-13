// Festival data is stored in client-side data files
// No backend storage needed for this festival homepage

export interface IStorage {
  // Placeholder for future storage needs
}

export class MemStorage implements IStorage {
  constructor() {
    // No storage needed for static festival data
  }
}

export const storage = new MemStorage();
