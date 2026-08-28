import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';

/** Resposta de sucesso padronizada. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Converte qualquer exceção em resposta JSON consistente.
 * Usado por todos os route handlers para manter os controllers enxutos.
 */
export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }
  console.error('[unhandled]', error);
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}
