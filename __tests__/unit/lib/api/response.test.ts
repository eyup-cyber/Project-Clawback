/**
 * Unit tests for API response utilities
 */

import {
  success,
  created,
  noContent,
  paginated,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  ApiError,
} from '@/lib/api/response';

describe('API Response Utilities', () => {
  describe('success', () => {
    it('should return 200 status with data', async () => {
      const data = { id: '123', name: 'Test' };
      const response = success(data);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should allow custom status code', async () => {
      const response = success({ test: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('created', () => {
    it('should return 201 status', async () => {
      const data = { id: 'new-id' };
      const response = created(data);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });
  });

  describe('noContent', () => {
    it('should return 204 status with no body', () => {
      const response = noContent();
      expect(response.status).toBe(204);
    });
  });

  describe('paginated', () => {
    it('should return paginated response with metadata', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = paginated(data, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should calculate hasNext and hasPrev correctly', async () => {
      const response = paginated([], {
        page: 2,
        limit: 10,
        total: 25,
      });

      const json = await response.json();
      expect(json.pagination.hasNext).toBe(true);
      expect(json.pagination.hasPrev).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const response = paginated([], {
        page: 3,
        limit: 10,
        total: 25,
      });

      const json = await response.json();
      expect(json.pagination.hasNext).toBe(false);
      expect(json.pagination.hasPrev).toBe(true);
    });
  });

  describe('Error responses', () => {
    it('badRequest should return 400', async () => {
      const response = badRequest('Invalid input');
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toBe('Invalid input');
    });

    it('unauthorized should return 401', async () => {
      const response = unauthorized();
      expect(response.status).toBe(401);
    });

    it('forbidden should return 403', async () => {
      const response = forbidden();
      expect(response.status).toBe(403);
    });

    it('notFound should return 404', async () => {
      const response = notFound('User');
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.message).toContain('User');
    });

    it('conflict should return 409', async () => {
      const response = conflict('Already exists');
      expect(response.status).toBe(409);
    });

    it('internalError should return 500', async () => {
      const response = internalError();
      expect(response.status).toBe(500);
    });
  });

  describe('ApiError class', () => {
    it('should create error with code and details', () => {
      const error = new ApiError('Test error', 'VALIDATION_ERROR', { field: 'email' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should have static factory methods', () => {
      const badReq = ApiError.badRequest('Bad');
      expect(badReq.code).toBe('BAD_REQUEST');

      const unauth = ApiError.unauthorized();
      expect(unauth.code).toBe('UNAUTHORIZED');

      const notFoundErr = ApiError.notFound('Item');
      expect(notFoundErr.code).toBe('NOT_FOUND');
    });
  });
});
