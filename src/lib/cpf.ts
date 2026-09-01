/** Utilitários de CPF (validação dos dígitos verificadores e formatação). */

/** Mantém apenas os dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida um CPF pelos dois dígitos verificadores.
 * Rejeita também as sequências repetidas (111.111.111-11 e afins).
 */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** 12345678901 -> 123.456.789-01 */
export function formatCPF(value: string | null | undefined): string {
  const cpf = onlyDigits(value ?? '');
  if (cpf.length !== 11) return value ?? '—';
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Máscara progressiva enquanto a pessoa digita. */
export function maskCPF(value: string): string {
  const cpf = onlyDigits(value).slice(0, 11);
  return cpf
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
