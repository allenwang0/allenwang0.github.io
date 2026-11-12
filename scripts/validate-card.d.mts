import type { Card } from "../src/lib/card";

export type CardError = { path: string; message: string };
export function validateCard(text: string, slug: string): { ok: true; card: Card } | { ok: false; errors: CardError[] };
export function formatErrors(slug: string, errors: CardError[]): string;
