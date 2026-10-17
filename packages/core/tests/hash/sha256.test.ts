import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex, sha256HexOfText } from '../../src/hash/sha256';

const nodeSha = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

describe('sha256Hex', () => {
  it('trifft die Prüfwerte aus FIPS 180-4', () => {
    expect(sha256HexOfText('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256HexOfText('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256HexOfText('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('stimmt an allen Blockgrenzen mit Node überein', () => {
    for (const length of [1, 55, 56, 63, 64, 65, 119, 120, 128, 1000]) {
      const data = Uint8Array.from({ length }, (_, i) => (i * 31 + length) & 0xff);
      expect(sha256Hex(data)).toBe(nodeSha(data));
    }
  });

  it('hasht Umlaute als UTF-8', () => {
    const text = 'Stahlbetonwände C30/37, Länge ≥ 2,50 m';
    expect(sha256HexOfText(text)).toBe(nodeSha(new TextEncoder().encode(text)));
  });
});
