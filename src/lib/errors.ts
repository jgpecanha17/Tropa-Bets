/** Erro de domínio com status HTTP — traduzido em resposta JSON pelos controllers. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Unauthorized = (msg = 'Você precisa estar autenticado.') => new AppError(msg, 401);
export const Forbidden = (msg = 'Você não tem permissão para esta ação.') => new AppError(msg, 403);
export const NotFound = (msg = 'Registro não encontrado.') => new AppError(msg, 404);
export const BadRequest = (msg: string, details?: unknown) => new AppError(msg, 400, details);
