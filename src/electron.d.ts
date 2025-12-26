export interface IElectronAPI {
  selectDirectory: () => Promise<string | null>;
  saveCharacter: (filePath: string, data: any) => Promise<{ success: boolean; error?: string }>;
  loadCharacters: (directoryPath: string) => Promise<any[]>;
  deleteCharacter: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  setFullScreen: (isFullScreen: boolean) => void;
  toggleFullScreen: () => void;
  closeApp: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

