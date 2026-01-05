import { JwtAuthGuard } from './jwt.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      // JwtAuthGuard extends AuthGuard('jwt')
      // This is a simple wrapper, tested through integration tests
      expect(guard).toBeDefined();
    });

    it('should be an instance of JwtAuthGuard', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });
});
