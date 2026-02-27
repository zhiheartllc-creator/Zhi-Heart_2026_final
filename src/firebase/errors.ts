export class FirestorePermissionError extends Error {
  public path: string;
  public operation: string;
  public requestResourceData: any;

  constructor(details: { path: string; operation: string; requestResourceData: any }) {
    super(`Error de permisos en Firestore al intentar '${details.operation}' en la ruta '${details.path}'`);
    this.name = 'FirestorePermissionError';
    this.path = details.path;
    this.operation = details.operation;
    this.requestResourceData = details.requestResourceData;

    // Mantener la traza del stack de errores correcta (solo para entornos V8 como Node/Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}