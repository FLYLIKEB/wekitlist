export type LocalBucketItem = {
  id: string;
  title: string;
  completedAt: string | null;
};

export type LocalSharedList = {
  groupName: string;
  displayName: string;
  items: LocalBucketItem[];
};

export const LOCAL_LIST_KEY = 'wekitlist-local';

export function createLocalList(groupName: string, displayName: string): LocalSharedList {
  return {
    groupName,
    displayName,
    items: [],
  };
}

export function addLocalItem(list: LocalSharedList, title: string): LocalSharedList {
  return {
    ...list,
    items: [
      {
        id: crypto.randomUUID(),
        title,
        completedAt: null,
      },
      ...list.items,
    ],
  };
}

export function completeLocalItem(list: LocalSharedList, itemId: string): LocalSharedList {
  return {
    ...list,
    items: list.items.map((item) =>
      item.id === itemId ? { ...item, completedAt: new Date().toISOString() } : item,
    ),
  };
}
