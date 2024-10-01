import sha1 from 'sha1';
import { test } from 'mocha';
import { expect } from 'chai';
import { hashPassword, checkHashedPassword } from '../../utils/encrypt';

describe('Testing password encryption methods', () => {
  const testPassword = 'testPassword123';
  const hashedTestPassword = sha1(testPassword);

  test('hashPassword should correctly hash a password', () => {
    const result = hashPassword(testPassword);
    expect(result).to.be.equal(hashedTestPassword);
  });

  test('checkHashedPassword should return true for matching passwords', () => {
    const result = checkHashedPassword(testPassword, hashedTestPassword);
    expect(result).to.be.true;
  });

  test('checkHashedPassword should return false for non-matching passwords', () => {
    const result = checkHashedPassword('wrongPassword', hashedTestPassword);
    expect(result).to.be.false;
  });

  test('hashPassword should produce different hashes for different passwords', () => {
    const password1 = 'password1';
    const password2 = 'password2';
    const hash1 = hashPassword(password1);
    const hash2 = hashPassword(password2);
    expect(hash1).not.to.be.equal(hash2);
  });

  test('hashPassword should produce consistent results', () => {
    const hash1 = hashPassword(testPassword);
    const hash2 = hashPassword(testPassword);
    expect(hash1).to.be.equal(hash2);
  });
});
