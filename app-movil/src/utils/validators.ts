export const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export const isRequired = (value: string) => value.trim().length > 0;

export const hasMinLength = (value: string, minLength: number) => value.length >= minLength;
