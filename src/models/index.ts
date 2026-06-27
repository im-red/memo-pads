export interface Memo {
  id: string;
  originalText: string;
  explanation: string;
  notebookId: string;

  createdAt: string;
  updatedAt: string;
  importOrder: number;
  version: number;
  deviceId: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Notebook {
  id: string;
  name: string;

  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ViewProgress {
  notebookId: string;
  currentMemoId: string | null;
}
