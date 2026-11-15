export type StoredFile = {
  bytes: number;
  contentType: string;
  key: string;
  sha256: string;
};

export type OpenedFile = StoredFile & { absolutePath: string };

export type StorageHealth = {
  available: boolean;
  provider: 'filesystem';
  reason?: string;
};
