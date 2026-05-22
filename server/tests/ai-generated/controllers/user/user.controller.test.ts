import { Request, Response } from 'express';
import { getRestaurantInformation } from '../../../../src/controllers/user/user.controller';
import { getRestaurantinfo as mockGetRestaurantInfo } from '../../../../src/models/auth/auth.model';
import { RestaurantDao as MockRestaurantDao } from '../../../../src/dao/restaurant.dao';

// Mock the auth model and DAO
jest.mock('../../../../src/models/auth/auth.model', () => ({
  getRestaurantinfo: jest.fn(),
}));
jest.mock('../../../../src/dao/restaurant.dao', () => ({
  RestaurantDao: {
    getRestaurantData: jest.fn(),
    saveRestaurantData: jest.fn(),
  },
}));

describe('getRestaurantInformation', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const restaurantRedisData = {
    id: 'res123',
    name: 'Test Restaurant (Redis)',
    address: '123 Redis St',
  };

  const restaurantDbData = {
    id: 'res123',
    name: 'Test Restaurant (DB)',
    address: '456 DB Ave',
    phone: '555-1234',
  };

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis(); // Allows chaining .status().json()
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockRequest = {};

    // Clear all mocks before each test
    (mockGetRestaurantInfo as jest.Mock).mockClear();
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockClear();
    (MockRestaurantDao.saveRestaurantData as jest.Mock).mockClear();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockRequest.user = undefined;

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(MockRestaurantDao.getRestaurantData).not.toHaveBeenCalled();
    expect(mockGetRestaurantInfo).not.toHaveBeenCalled();
  });

  it('should return restaurant data from Redis if available', async () => {
    mockRequest.user = { reference_id: 'user_ref_123' };
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockResolvedValueOnce(restaurantRedisData);

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(MockRestaurantDao.getRestaurantData).toHaveBeenCalledWith('user_ref_123');
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'sucessfull', restaurantData: restaurantRedisData });
    expect(mockGetRestaurantInfo).not.toHaveBeenCalled(); // Should not hit DB
    expect(MockRestaurantDao.saveRestaurantData).not.toHaveBeenCalled(); // Should not save to Redis again
  });

  it('should fetch from DB, save to Redis, and return data if not in Redis', async () => {
    mockRequest.user = { reference_id: 'user_ref_123' };
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockResolvedValueOnce(null); // Not found in Redis
    (mockGetRestaurantInfo as jest.Mock).mockResolvedValueOnce(restaurantDbData); // Found in DB

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(MockRestaurantDao.getRestaurantData).toHaveBeenCalledWith('user_ref_123');
    expect(mockGetRestaurantInfo).toHaveBeenCalledWith('user_ref_123'); // Should hit DB
    expect(MockRestaurantDao.saveRestaurantData).toHaveBeenCalledWith('user_ref_123', restaurantDbData); // Should save to Redis
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'sucessfull', restaurantData: restaurantDbData });
  });

  it('should return 503 if data not in Redis and not found in DB', async () => {
    mockRequest.user = { reference_id: 'user_ref_123' };
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockResolvedValueOnce(null); // Not found in Redis
    (mockGetRestaurantInfo as jest.Mock).mockResolvedValueOnce(null); // Not found in DB

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(MockRestaurantDao.getRestaurantData).toHaveBeenCalledWith('user_ref_123');
    expect(mockGetRestaurantInfo).toHaveBeenCalledWith('user_ref_123');
    expect(MockRestaurantDao.saveRestaurantData).toHaveBeenCalledWith('user_ref_123', null); // saveRestaurantData is called even if userCompleteData is null
    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Error fetching restaurant details' });
  });

  it('should return 500 if an error occurs during data fetching', async () => {
    mockRequest.user = { reference_id: 'user_ref_123' };
    const errorMessage = 'Database connection error';
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(MockRestaurantDao.getRestaurantData).toHaveBeenCalledWith('user_ref_123');
    expect(mockGetRestaurantInfo).not.toHaveBeenCalled(); // Error before hitting DB
    expect(MockRestaurantDao.saveRestaurantData).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Internal Server Error' });
  });

  it('should return 500 if an error occurs while fetching from DB', async () => {
    mockRequest.user = { reference_id: 'user_ref_123' };
    const errorMessage = 'DB query failed';
    (MockRestaurantDao.getRestaurantData as jest.Mock).mockResolvedValueOnce(null); // Not found in Redis
    (mockGetRestaurantInfo as jest.Mock).mockRejectedValueOnce(new Error(errorMessage)); // Error from DB model

    await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

    expect(MockRestaurantDao.getRestaurantData).toHaveBeenCalledWith('user_ref_123');
    expect(mockGetRestaurantInfo).toHaveBeenCalledWith('user_ref_123');
    expect(MockRestaurantDao.saveRestaurantData).not.toHaveBeenCalled(); // Error before saving
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Internal Server Error' });
  });
});