export async function dropLegacyTtlIndex(collection: any, field: string) {
  let indexes: any[];
  try {
    indexes = await collection.indexes();
  } catch (error: any) {
    if (error?.codeName === 'NamespaceNotFound' || error?.code === 26) return;
    throw error;
  }
  for (const index of indexes) {
    if (index.expireAfterSeconds !== undefined && index.key?.[field] === 1 && index.name) {
      await collection.dropIndex(index.name);
    }
  }
}
