export const isRequired = (value: unknown) => String(value ?? '').trim().length > 0;
