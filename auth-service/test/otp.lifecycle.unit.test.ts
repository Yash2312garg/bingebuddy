import { OTPService, OTP_CONFIG } from '../src/utils/generateOTP';
import { OtpDao } from '../src/dao/otp.dao';
import bcrypt from 'bcryptjs';

// In-memory Redis simulation for unit tests
const redisStore = new Map<string, { value: string; ttl?: number }>();

jest.mock('../src/database/redis', () => ({
  redisClient: {
    get: jest.fn(async (key: string) => {
      const entry = redisStore.get(key);
      return entry ? entry.value : null;
    }),
    exists: jest.fn(async (key: string) => {
      return redisStore.has(key) ? 1 : 0;
    }),
    ttl: jest.fn(async (key: string) => {
      const entry = redisStore.get(key);
      if (!entry) return -2;
      return entry.ttl !== undefined ? entry.ttl : -1;
    }),
    decr: jest.fn(async (key: string) => {
      const entry = redisStore.get(key);
      const val = entry ? parseInt(entry.value, 10) - 1 : -1;
      redisStore.set(key, { value: val.toString() });
      return val;
    }),
    del: jest.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
    multi: jest.fn(() => {
      const operations: Array<() => any> = [];
      const multiProxy = {
        setEx: (key: string, ttl: number, value: string) => {
          operations.push(() => {
            redisStore.set(key, { value, ttl });
          });
          return multiProxy;
        },
        incr: (key: string) => {
          operations.push(() => {
            const entry = redisStore.get(key);
            const val = entry ? parseInt(entry.value, 10) + 1 : 1;
            redisStore.set(key, { value: val.toString() });
            return val;
          });
          return multiProxy;
        },
        expire: (key: string, ttl: number) => {
          operations.push(() => {
            const entry = redisStore.get(key);
            if (entry) {
              entry.ttl = ttl;
            }
          });
          return multiProxy;
        },
        exec: jest.fn(async () => {
          const results = operations.map((op) => op());
          return results;
        }),
      };
      return multiProxy;
    }),
  },
}));

describe('OTP Lifecycle & Resend Logic Unit Tests', () => {
  const testEmail = 'chef@restaurant.com';

  beforeEach(() => {
    redisStore.clear();
    jest.clearAllMocks();
  });

  describe('1. Initial OTP Generation (Login)', () => {
    it('should generate and store OTP with 3 attempts and 60s cooldown', async () => {
      const otp = await OTPService.generateAndStore(testEmail, false);

      expect(otp).toBeDefined();
      expect(otp.length).toBe(OTP_CONFIG.LENGTH);

      // Verify attempts stored is MAX_ATTEMPTS (3)
      const attempts = await OtpDao.getRemainingAttempts(testEmail);
      expect(attempts).toBe('3');

      // Verify cooldown is active
      const cooldownActive = await OtpDao.checkCoolDown(testEmail);
      expect(cooldownActive).toBe(1);

      // Verify resend count starts at 0
      const resends = await OtpDao.getResendCount(testEmail);
      expect(resends).toBe(0);
    });

    it('should reject generation during the 60s cooldown period', async () => {
      await OTPService.generateAndStore(testEmail, false);

      // Cooldown is set to 60s in mock
      redisStore.set(OtpDao.getCooldownKey(testEmail), { value: '1', ttl: 45 });

      await expect(OTPService.generateAndStore(testEmail, false)).rejects.toThrow(
        /Please wait 45 seconds before requesting a new OTP/
      );
    });
  });

  describe('2. OTP Resend Lifecycle', () => {
    it('should allow resend after cooldown expires and preserve verification attempts', async () => {
      // Step 1: Initial login
      const otp1 = await OTPService.generateAndStore(testEmail, false);

      // Step 2: Failed verification consumes 1 attempt (3 -> 2)
      await expect(OTPService.verify(testEmail, '000000')).rejects.toThrow(/2 attempts remaining/);
      expect(await OtpDao.getRemainingAttempts(testEmail)).toBe('2');

      // Step 3: Simulate cooldown expiry
      await OtpDao.deleteCooldown(testEmail);

      // Step 4: Resend OTP (isResend = true)
      const otp2 = await OTPService.generateAndStore(testEmail, true);
      expect(otp2).toBeDefined();

      // Crucial Fix Check: Verification attempts must STAY at 2, NOT reset to 3!
      const attemptsAfterResend = await OtpDao.getRemainingAttempts(testEmail);
      expect(attemptsAfterResend).toBe('2');

      // Resends counter should be incremented to 1
      const resendCount = await OtpDao.getResendCount(testEmail);
      expect(resendCount).toBe(1);
    });

    it('should enforce MAX_RESENDS cap (max 3 resends per session)', async () => {
      // Initial login
      await OTPService.generateAndStore(testEmail, false);

      // 3 successful resends
      for (let i = 1; i <= OTP_CONFIG.MAX_RESENDS; i++) {
        await OtpDao.deleteCooldown(testEmail);
        await OTPService.generateAndStore(testEmail, true);
        expect(await OtpDao.getResendCount(testEmail)).toBe(i);
      }

      // 4th resend must fail with MAX_RESENDS reached error
      await OtpDao.deleteCooldown(testEmail);
      await expect(OTPService.generateAndStore(testEmail, true)).rejects.toThrow(
        /Maximum OTP resend limit reached \(3\)/
      );
    });

    it('should reject resend if attempts were previously exhausted', async () => {
      await OTPService.generateAndStore(testEmail, false);

      // Exhaust all 3 attempts
      redisStore.set(OtpDao.getAttemptsKey(testEmail), { value: '0' });
      await OtpDao.deleteCooldown(testEmail);

      await expect(OTPService.generateAndStore(testEmail, true)).rejects.toThrow(
        /Maximum verification attempts exceeded for this session/
      );
    });
  });

  describe('3. Cooldown & Ghost Key Cleanup on Error', () => {
    it('should delete cooldown key when deleteCooldown is invoked', async () => {
      await OTPService.generateAndStore(testEmail, false);
      expect(await OtpDao.checkCoolDown(testEmail)).toBe(1);

      // Simulate rollback after RabbitMQ publish failure
      await OtpDao.deleteCooldown(testEmail);
      expect(await OtpDao.checkCoolDown(testEmail)).toBe(0);
    });

    it('should return 0 instead of negative numbers for non-existent TTLs', async () => {
      // Non-existent cooldown and OTP
      const cdTTL = await OtpDao.getCoolDownTTL('unknown@example.com');
      const otpTTL = await OtpDao.getOtpTTL('unknown@example.com');

      expect(cdTTL).toBe(0);
      expect(otpTTL).toBe(0);
    });

    it('should completely purge OTP, attempts, cooldown, and resends on clearAll', async () => {
      await OTPService.generateAndStore(testEmail, false);
      await OtpDao.incrementResendCount(testEmail, 600);

      await OtpDao.clearAll(testEmail);

      expect(await OtpDao.getOTP(testEmail)).toBeNull();
      expect(await OtpDao.getRemainingAttempts(testEmail)).toBeNull();
      expect(await OtpDao.checkCoolDown(testEmail)).toBe(0);
      expect(await OtpDao.getResendCount(testEmail)).toBe(0);
    });
  });
});
