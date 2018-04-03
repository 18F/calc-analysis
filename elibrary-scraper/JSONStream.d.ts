import { Writable, Transform } from 'stream';

export function stringify(open?: string, sep?: string, close?: string): Writable;

export function parse(path: string): Transform;
